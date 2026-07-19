import { useState, useEffect, useRef, FormEvent } from 'react';
import { chatApi, ChatMessage } from '../api/chat';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, Send, X } from 'lucide-react';

interface Props {
  questionnaireId: string;
  sectionId: string;
  sectionName: string;
}

export function ChatPanel({ questionnaireId, sectionId, sectionName }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const msgs = await chatApi.getMessages(questionnaireId, sectionId);
      setMessages(msgs);

      // Mark unread messages as read
      for (const msg of msgs) {
        if (!msg.letto && msg.userId !== user?.id) {
          chatApi.markAsRead(msg.id).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Chat load error:', err);
    }
  };

  useEffect(() => {
    if (open) {
      loadMessages();
      const interval = setInterval(loadMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [open, sectionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      await chatApi.sendMessage(questionnaireId, sectionId, newMessage.trim());
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 p-3.5 rounded-full shadow-lg transition-colors z-40 ${
          open ? 'bg-gray-600 text-white' : 'bg-primary-700 text-white hover:bg-primary-800'
        }`}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-40">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 rounded-t-2xl bg-primary-700 text-white">
            <p className="font-medium text-sm">Chat - {sectionName}</p>
            <p className="text-xs text-primary-200">Messaggi relativi a questa sezione</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-gray-400 mt-8">
                Nessun messaggio. Inizia la conversazione.
              </p>
            )}
            {messages.map((msg) => {
              const isOwn = msg.userId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                      isOwn
                        ? 'bg-primary-700 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-xs font-medium text-primary-600 mb-0.5">
                        {msg.user.nome} {msg.user.cognome}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.messaggio}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
                      {new Date(msg.createdAt).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Scrivi un messaggio..."
                className="flex-1 px-3.5 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <button
                type="submit"
                disabled={loading || !newMessage.trim()}
                className="p-2 bg-primary-700 text-white rounded-full hover:bg-primary-800 transition-colors disabled:opacity-50"
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
