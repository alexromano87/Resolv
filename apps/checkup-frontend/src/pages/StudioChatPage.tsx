import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, ArchiveRestore, ArrowDown, ArrowLeft, Building2, Check, CheckCheck, ChevronLeft, MessageCircle, Pencil, Plus, Printer, Search, Send, Trash2, UserRound, Users } from 'lucide-react';
import { preassessmentStaffChatApi, type StaffChatConversation } from '../api/preassessment';
import { useAuth } from '../contexts/AuthContext';
import { BodyPortal } from '../components/ui/BodyPortal';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import { downloadTextFile, formatDateTime, sanitizeFilename } from '../utils/textExport';

type RecipientTab = 'sublicenziatari' | 'utenti' | 'colleghi';

type RecipientDirectory = Awaited<ReturnType<typeof preassessmentStaffChatApi.listRecipients>>;

type DirectChatMessage = Awaited<ReturnType<typeof preassessmentStaffChatApi.getMessages>>[number];

export function StudioChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const isClient = user?.ruolo === 'cliente';

  const [conversations, setConversations] = useState<StaffChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get('search') ?? '');
  const [showArchived, setShowArchived] = useState(searchParams.get('archived') === 'true');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(searchParams.get('conversationId'));
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

  const [showRecipients, setShowRecipients] = useState(false);
  const [recipientTab, setRecipientTab] = useState<RecipientTab>('sublicenziatari');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientDirectory, setRecipientDirectory] = useState<RecipientDirectory>({ clients: [], colleagueUsers: [], studioUsers: [] });
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [selectedRecipientClientId, setSelectedRecipientClientId] = useState<string | null>(null);

  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const didAutoScrollRef = useRef(false);
  const currentStudioLabel =
    user?.studioNome ||
    user?.licenziatarioNome ||
    user?.studio?.nome ||
    'studio';

  const selectedConversation = useMemo(
    () => conversations.find((entry) => entry.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const activeRecipientClient = useMemo(
    () => recipientDirectory.clients.find((entry) => entry.id === selectedRecipientClientId) ?? null,
    [recipientDirectory.clients, selectedRecipientClientId],
  );

  const normalizedRecipientSearch = recipientSearch.trim().toLowerCase();

  const visibleClients = useMemo(() => {
    if (isClient) return [];
    return recipientDirectory.clients.filter((entry) => {
      if (!normalizedRecipientSearch) return true;
      if (`${entry.label} ${entry.subtitle}`.toLowerCase().includes(normalizedRecipientSearch)) return true;
      return entry.users.some((userEntry) => `${userEntry.nome} ${userEntry.cognome} ${userEntry.email} ${userEntry.azienda || ''}`.toLowerCase().includes(normalizedRecipientSearch));
    });
  }, [isClient, normalizedRecipientSearch, recipientDirectory.clients]);

  const visibleColleagueUsers = useMemo(() => {
    return recipientDirectory.colleagueUsers.filter((entry) => {
      if (!normalizedRecipientSearch) return true;
      return `${entry.nome} ${entry.cognome} ${entry.email} ${entry.azienda || ''}`.toLowerCase().includes(normalizedRecipientSearch);
    });
  }, [normalizedRecipientSearch, recipientDirectory.colleagueUsers]);

  const visibleClientUsers = useMemo(() => {
    if (!activeRecipientClient) return [];
    return activeRecipientClient.users.filter((entry) => {
      if (!normalizedRecipientSearch) return true;
      return `${entry.nome} ${entry.cognome} ${entry.email} ${entry.azienda || ''}`.toLowerCase().includes(normalizedRecipientSearch);
    });
  }, [activeRecipientClient, normalizedRecipientSearch]);

  const visibleStudioUsers = useMemo(() => {
    return recipientDirectory.studioUsers.filter((entry) => {
      if (!normalizedRecipientSearch) return true;
      return `${entry.nome} ${entry.cognome} ${entry.email} ${entry.azienda || ''}`.toLowerCase().includes(normalizedRecipientSearch);
    });
  }, [normalizedRecipientSearch, recipientDirectory.studioUsers]);

  const scrollToLatest = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
    setShowScrollToLatest(false);
  }, []);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await preassessmentStaffChatApi.listConversations(appliedSearch || undefined, showArchived);
      setConversations(data);
      setError(null);
      if (!selectedConversationId && data.length > 0) {
        const requestedConversationId = searchParams.get('conversationId');
        const requestedClientId = searchParams.get('clientId');
        const nextConversation = requestedConversationId
          ? data.find((entry) => entry.id === requestedConversationId)
          : requestedClientId
            ? data.find((entry) => entry.clientId === requestedClientId || entry.participant.clientId === requestedClientId)
            : data[0];
        setSelectedConversationId(nextConversation?.id ?? data[0].id);
      }
      if (selectedConversationId && !data.some((entry) => entry.id === selectedConversationId)) {
        setSelectedConversationId(data[0]?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle chat');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [appliedSearch, searchParams, selectedConversationId, showArchived]);

  const loadMessages = useCallback(async (markRead = false) => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    try {
      setMessagesLoading(true);
      const data = await preassessmentStaffChatApi.getMessages(selectedConversationId);
      setMessages(data);
      if (markRead) {
        const unread = data.filter((entry) => !entry.letto && entry.userId !== user?.id);
        await Promise.all(unread.map((entry) => preassessmentStaffChatApi.markAsRead(entry.id).catch(() => {})));
        if (unread.length > 0) {
          window.dispatchEvent(new CustomEvent('checkup:mark-seen', { detail: 'chat' }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei messaggi');
    } finally {
      setMessagesLoading(false);
    }
  }, [selectedConversationId, user?.id]);

  const loadRecipients = useCallback(async () => {
    try {
      setRecipientLoading(true);
      const data = await preassessmentStaffChatApi.listRecipients();
      setRecipientDirectory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei destinatari');
    } finally {
      setRecipientLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('conversationId', selectedConversationId);
      next.delete('clientId');
      if (appliedSearch) next.set('search', appliedSearch);
      else next.delete('search');
      if (showArchived) next.set('archived', 'true');
      else next.delete('archived');
      return next;
    }, { replace: true });
    didAutoScrollRef.current = false;
    loadMessages(true);
    const interval = setInterval(() => {
      loadMessages(true);
      loadConversations(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConversationId, appliedSearch, showArchived, loadMessages, loadConversations, setSearchParams]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 48;
      setShowScrollToLatest(!nearBottom);
    };
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, [selectedConversationId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 64;
    if (!didAutoScrollRef.current || nearBottom) {
      scrollToLatest();
      didAutoScrollRef.current = true;
    }
  }, [messages, scrollToLatest]);

  useEffect(() => {
    if (!showRecipients) return;
    setRecipientSearch('');
    setSelectedRecipientClientId(null);
    setRecipientTab(isClient ? 'colleghi' : 'sublicenziatari');
    loadRecipients();
  }, [showRecipients, loadRecipients, isClient]);

  const handleCreateConversation = useCallback(async (participantUserId: string) => {
    try {
      const conversation = await preassessmentStaffChatApi.createConversation(participantUserId);
      setSelectedConversationId(conversation.id);
      setShowRecipients(false);
      setSelectedRecipientClientId(null);
      await loadConversations(true);
      await loadMessages(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell’apertura della chat');
    }
  }, [loadConversations, loadMessages]);

  const handleSend = async () => {
    if (!selectedConversationId || !messageText.trim()) return;
    try {
      setSending(true);
      await preassessmentStaffChatApi.sendMessage(selectedConversationId, messageText.trim());
      setMessageText('');
      await loadMessages(false);
      await loadConversations(true);
      scrollToLatest();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l’invio del messaggio');
    } finally {
      setSending(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!selectedConversation) return;
    try {
      if (showArchived) {
        await preassessmentStaffChatApi.restoreConversation(selectedConversation.id);
      } else {
        await preassessmentStaffChatApi.archiveConversation(selectedConversation.id);
      }
      setSelectedConversationId(null);
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l’aggiornamento della chat');
    }
  };

  const canEditMessage = (message: DirectChatMessage) =>
    message.userId === user?.id && Date.now() - new Date(message.createdAt).getTime() <= 15 * 60 * 1000;

  const handleStartEditMessage = (message: DirectChatMessage) => {
    setEditingMessageId(message.id);
    setEditingMessageText(message.messaggio);
  };

  const handleSaveMessageEdit = async () => {
    if (!editingMessageId || !editingMessageText.trim()) return;
    try {
      await preassessmentStaffChatApi.updateMessage(editingMessageId, editingMessageText.trim());
      setEditingMessageId(null);
      setEditingMessageText('');
      await loadMessages(false);
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la modifica del messaggio');
    }
  };

  const handleDeleteMessage = async (message: DirectChatMessage) => {
    const forEveryone = message.userId === user?.id && Date.now() - new Date(message.createdAt).getTime() <= 15 * 60 * 1000;
    const ok = await confirm({
      title: 'Elimina messaggio',
      message: forEveryone
        ? 'Vuoi eliminare questo messaggio per tutti i partecipanti alla chat?'
        : 'Il limite di tempo per eliminarlo per tutti e scaduto. Vuoi eliminare questo messaggio solo dalla tua chat?',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await preassessmentStaffChatApi.deleteMessage(message.id);
      await loadMessages(false);
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l’eliminazione del messaggio');
    }
  };

  const handleExport = () => {
    if (!selectedConversation) return;
    const participantLabel = `${selectedConversation.participant.nome} ${selectedConversation.participant.cognome}`.trim();
    const lines: string[] = [
      'ESPORTAZIONE CHAT',
      `Conversazione: ${participantLabel}`,
      `Azienda: ${selectedConversation.participant.azienda || '-'}`,
      `Generato il: ${formatDateTime(new Date().toISOString())}`,
      '',
    ];
    messages.forEach((message, index) => {
      lines.push(`${index + 1}. ${message.user.nome} ${message.user.cognome} - ${formatDateTime(message.createdAt)}`);
      lines.push(message.messaggio);
      lines.push('');
    });
    downloadTextFile(`chat-${sanitizeFilename(participantLabel || 'utente')}-${new Date().toISOString().slice(0, 10)}.txt`, lines.join('\n'));
  };

  return (
    <div className="space-y-6 wow-stagger">
      <div className="flex flex-col gap-4 p-1 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(user?.ruolo === 'cliente' ? '/checkup' : '/checkup/dashboard-studio')} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-indigo-600" title="Torna indietro">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="wow-chip">Messaggistica</span>
          </div>
          <h1 className="display-font text-2xl font-semibold text-slate-900">Chat</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            {isClient
              ? 'Consulta e gestisci le conversazioni con il tuo studio.'
              : 'Consulta e gestisci le conversazioni con colleghi e clienti.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="wow-button-ghost" disabled={!selectedConversation}>
            <Printer className="h-4 w-4" />
            Esporta
          </button>
          <button onClick={() => { setShowArchived((value) => !value); setSelectedConversationId(null); }} className="wow-button-ghost">
            {showArchived ? <MessageCircle className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {showArchived ? 'Chat attive' : 'Archiviate'}
          </button>
          <button onClick={() => setShowRecipients(true)} className="wow-button">
            <Plus className="h-4 w-4" />
            Nuova chat
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[360px,minmax(0,1fr)]">
        <div className="wow-panel p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setAppliedSearch(search.trim());
                }}
                placeholder="Cerca utente o azienda"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <button onClick={() => setAppliedSearch(search.trim())} className="wow-button">
              <Search className="h-4 w-4" />
              Cerca
            </button>
          </div>
          <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400">Caricamento chat...</div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Nessuna chat disponibile</div>
            ) : (
              conversations.map((entry) => {
                const isActive = entry.id === selectedConversationId;
                const participantLabel = `${entry.participant.nome} ${entry.participant.cognome}`.trim();
                const company = entry.participant.azienda || entry.participant.email;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedConversationId(entry.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${isActive ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-indigo-100 p-2 text-indigo-600"><MessageCircle className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{participantLabel}</p>
                          {entry.unreadCount > 0 && <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{entry.unreadCount > 99 ? '99+' : entry.unreadCount}</span>}
                        </div>
                        <p className="truncate text-xs text-slate-500">{company}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{entry.lastMessage?.messaggio || 'Nessun messaggio. Inizia la conversazione.'}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="wow-panel flex h-[72vh] min-h-0 flex-col overflow-hidden">
          {!selectedConversation ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Seleziona una chat dalla lista.</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{`${selectedConversation.participant.nome} ${selectedConversation.participant.cognome}`.trim()}</p>
                  <p className="truncate text-xs text-slate-500">{selectedConversation.participant.azienda || selectedConversation.participant.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={handleArchiveToggle} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600" title={showArchived ? 'Ripristina chat' : 'Archivia chat'}>
                    {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="relative flex-1 min-h-0">
                <div ref={scrollRef} className="h-full overflow-y-auto px-5 py-4 space-y-3">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">Caricamento messaggi...</div>
                  ) : messages.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">Nessun messaggio. Inizia la conversazione.</div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.userId === user?.id;
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${isOwn ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                            {!isOwn && <div className="mb-1 text-[11px] font-semibold text-blue-600">{message.user.nome} {message.user.cognome}</div>}
                            {editingMessageId === message.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingMessageText}
                                  onChange={(event) => setEditingMessageText(event.target.value)}
                                  className="min-h-20 w-full rounded-xl border border-blue-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-400"
                                />
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => { setEditingMessageId(null); setEditingMessageText(''); }} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                                    Annulla
                                  </button>
                                  <button type="button" onClick={handleSaveMessageEdit} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                                    Salva
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap">{message.messaggio}</div>
                            )}
                            <div className={`mt-1 flex items-center justify-end gap-1 text-right text-[10px] ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>
                              <span>{new Date(message.createdAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                              {message.editedAt ? <span>modificato</span> : null}
                              {isOwn ? (
                                message.letto ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />
                              ) : null}
                            </div>
                            <div className={`mt-1 flex justify-end gap-2 text-[10px] ${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                              {canEditMessage(message) && editingMessageId !== message.id ? (
                                <button type="button" onClick={() => handleStartEditMessage(message)} className="inline-flex items-center gap-1 font-semibold hover:underline">
                                  <Pencil className="h-3 w-3" />
                                  Modifica
                                </button>
                              ) : null}
                              <button type="button" onClick={() => handleDeleteMessage(message)} className="inline-flex items-center gap-1 font-semibold hover:underline">
                                <Trash2 className="h-3 w-3" />
                                Elimina
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {showScrollToLatest && (
                  <button type="button" onClick={scrollToLatest} className="absolute bottom-4 right-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800">
                    <ArrowDown className="h-4 w-4" />
                    Ultimo messaggio
                  </button>
                )}
              </div>
              <div className="border-t border-slate-200 px-5 py-3">
                <div className="flex items-center gap-2">
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') handleSend();
                    }}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={handleSend} disabled={sending || !messageText.trim()} className="rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-700 disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showRecipients && (
        <BodyPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRecipients(false)} />
            <div className="relative z-10 mx-4 flex w-full max-w-2xl max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="border-b border-slate-200 p-4">
                <h2 className="text-lg font-semibold text-slate-900">Nuova chat</h2>
                <p className="mt-1 text-sm text-slate-500">Seleziona l'utente con cui vuoi iniziare una nuova chat</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
                {!isClient && (
                  <>
                    <button onClick={() => { setRecipientTab('sublicenziatari'); setSelectedRecipientClientId(null); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${recipientTab === 'sublicenziatari' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Building2 className="mr-1 inline h-3.5 w-3.5" />
                      Clienti
                    </button>
                    <button onClick={() => { setRecipientTab('utenti'); setSelectedRecipientClientId(null); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${recipientTab === 'utenti' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Users className="mr-1 inline h-3.5 w-3.5" />
                      Colleghi {currentStudioLabel}
                    </button>
                  </>
                )}
                {isClient && (
                  <>
                    <button onClick={() => { setRecipientTab('colleghi'); setSelectedRecipientClientId(null); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${recipientTab === 'colleghi' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Users className="mr-1 inline h-3.5 w-3.5" />
                      Colleghi
                    </button>
                    <button onClick={() => { setRecipientTab('utenti'); setSelectedRecipientClientId(null); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${recipientTab === 'utenti' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <UserRound className="mr-1 inline h-3.5 w-3.5" />
                      Utenti studio
                    </button>
                  </>
                )}
                <div className="relative ml-auto w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Cerca utente o azienda" className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {recipientLoading ? (
                  <div className="py-8 text-center text-sm text-slate-400">Caricamento destinatari...</div>
                ) : recipientTab === 'colleghi' ? (
                  visibleColleagueUsers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">Nessun risultato</div>
                  ) : visibleColleagueUsers.map((entry) => (
                    <button
                      key={`colleague:${entry.id}`}
                      onClick={() => handleCreateConversation(entry.id)}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-indigo-100 p-2 text-indigo-600"><Users className="h-4 w-4" /></div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{`${entry.nome} ${entry.cognome}`.trim()}</p>
                          <p className="text-xs text-slate-500">{entry.azienda || entry.email}</p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : recipientTab === 'utenti' ? (
                  visibleStudioUsers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">Nessun risultato</div>
                  ) : visibleStudioUsers.map((entry) => (
                    <button
                      key={`studio:${entry.id}`}
                      onClick={() => handleCreateConversation(entry.id)}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-indigo-100 p-2 text-indigo-600"><UserRound className="h-4 w-4" /></div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{`${entry.nome} ${entry.cognome}`.trim()}</p>
                          <p className="text-xs text-slate-500">{entry.azienda || entry.email}</p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : selectedRecipientClientId ? (
                  <>
                    <button onClick={() => setSelectedRecipientClientId(null)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
                      <ChevronLeft className="h-4 w-4" />
                      Torna ai clienti
                    </button>
                    {visibleClientUsers.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-400">Nessun utente disponibile</div>
                    ) : visibleClientUsers.map((entry) => (
                      <button
                        key={`client-user:${entry.id}`}
                        onClick={() => handleCreateConversation(entry.id)}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-slate-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-indigo-100 p-2 text-indigo-600"><UserRound className="h-4 w-4" /></div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{`${entry.nome} ${entry.cognome}`.trim()}</p>
                            <p className="text-xs text-slate-500">{entry.azienda || activeRecipientClient?.label || entry.email}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                ) : visibleClients.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">Nessun risultato</div>
                ) : visibleClients.map((entry) => (
                  <button
                    key={`client:${entry.id}`}
                    onClick={() => setSelectedRecipientClientId(entry.id)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-indigo-100 p-2 text-indigo-600"><Building2 className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                        <p className="text-xs text-slate-500">{entry.subtitle}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{entry.users.length} utenti disponibili</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </BodyPortal>
      )}
      <ConfirmDialog />
    </div>
  );
}
