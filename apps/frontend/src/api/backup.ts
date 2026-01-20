import { api, API_BASE_URL } from './config';

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
  path: string;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup?: string;
  newestBackup?: string;
}

export const backupApi = {
  createBackup: async (): Promise<BackupInfo> => {
    return api.post<BackupInfo>('/backup/create', {});
  },

  listBackups: async (): Promise<BackupInfo[]> => {
    return api.get<BackupInfo[]>('/backup/list');
  },

  getStats: async (): Promise<BackupStats> => {
    return api.get<BackupStats>('/backup/stats');
  },

  downloadBackup: async (filename: string): Promise<void> => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';

    const response = await fetch(`${API_BASE_URL}/backup/download/${filename}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Errore durante il download del backup');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  deleteBackup: async (filename: string): Promise<{ success: boolean; message: string }> => {
    return api.delete<{ success: boolean; message: string }>(`/backup/${filename}`);
  },

  restoreBackup: async (filename: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>(`/backup/restore/${filename}`, {});
  },

  restoreFromUpload: async (file: File): Promise<{ success: boolean; message: string }> => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/backup/restore-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Errore nel ripristino' }));
      throw new Error(error.message || 'Errore nel ripristino del backup');
    }

    return response.json();
  },
};
