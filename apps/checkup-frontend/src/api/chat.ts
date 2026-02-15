import { api } from './config';

export interface ChatMessage {
  id: string;
  questionnaireId: string;
  sectionId: string;
  questionId: string | null;
  userId: string;
  messaggio: string;
  letto: boolean;
  createdAt: string;
  user: { id: string; nome: string; cognome: string; ruolo: string };
}

export interface UnreadCount {
  sectionId: string;
  count: number;
}

export const chatApi = {
  getMessages: (questionnaireId: string, sectionId: string) =>
    api.get<ChatMessage[]>(`/checkup/questionnaires/${questionnaireId}/sections/${sectionId}/chat`),

  sendMessage: (questionnaireId: string, sectionId: string, messaggio: string, questionId?: string) =>
    api.post<ChatMessage>(
      `/checkup/questionnaires/${questionnaireId}/sections/${sectionId}/chat`,
      { messaggio, questionId },
    ),

  markAsRead: (id: string) =>
    api.patch(`/checkup/chat/${id}/read`),

  getUnreadCounts: (questionnaireId: string) =>
    api.get<UnreadCount[]>(`/checkup/questionnaires/${questionnaireId}/chat/unread-count`),
};
