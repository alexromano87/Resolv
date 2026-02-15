import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { preassessmentChatApi, PreassessmentChatMessage } from '../api/preassessment';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  preassessmentId: string;
  sectionId: string;
  sectionName: string;
  enabled?: boolean;
}

export function PreassessmentChatPanel({ preassessmentId, sectionId, sectionName, enabled = true }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<PreassessmentChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    if (!enabled) return;
    try {
      const msgs = await preassessmentChatApi.getMessages(preassessmentId, sectionId);
      setMessages(msgs);
      for (const msg of msgs) {
        if (!msg.letto && msg.userId !== user?.id) {
          preassessmentChatApi.markAsRead(msg.id).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!open || !enabled) return;
    loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [open, sectionId, enabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setLoading(true);
    try {
      await preassessmentChatApi.sendMessage(preassessmentId, sectionId, newMessage.trim());
      setNewMessage('');
      await loadMessages();
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-40 rounded-full p-3 shadow-lg transition ${open ? 'bg-slate-700 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-40 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="bg-slate-900 px-4 py-3 text-white">
            <p className="text-sm font-semibold">Chat - {sectionName}</p>
            <p className="text-xs text-slate-300">Supporto alla compilazione</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-xs text-slate-400 mt-6">Nessun messaggio.</p>
            )}
            {messages.map((msg) => {
              const isOwn = msg.userId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${isOwn ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-900 rounded-bl-sm'}`}>
                    {!isOwn && (
                      <p className="text-[10px] font-semibold text-primary-600 mb-0.5">{msg.user.nome} {msg.user.cognome}</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.messaggio}</p>
                    <p className={`mt-1 text-[10px] ${isOwn ? 'text-primary-200' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Scrivi un messaggio..."
                className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                disabled={loading || !newMessage.trim()}
                className="rounded-full bg-primary-600 p-2 text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
