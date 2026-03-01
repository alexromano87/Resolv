import { api, API_BASE_URL } from './config';

export interface CheckupBackupInfo {
  filename: string;
  size: number;
  createdAt: string;
  path: string;
}

export interface CheckupBackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup?: string;
  newestBackup?: string;
}

export const checkupBackupApi = {
  createBackup: async (): Promise<CheckupBackupInfo> => {
    return api.post<CheckupBackupInfo>('/admin/checkup/backup/create', {});
  },

  listBackups: async (): Promise<CheckupBackupInfo[]> => {
    return api.get<CheckupBackupInfo[]>('/admin/checkup/backup/list');
  },

  getStats: async (): Promise<CheckupBackupStats> => {
    return api.get<CheckupBackupStats>('/admin/checkup/backup/stats');
  },

  downloadBackup: async (filename: string): Promise<void> => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';

    const response = await fetch(`${API_BASE_URL}/admin/checkup/backup/download/${filename}`, {
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
    return api.delete<{ success: boolean; message: string }>(`/admin/checkup/backup/${filename}`);
  },

  restoreBackup: async (filename: string): Promise<{ success: boolean; message: string }> => {
    return api.post<{ success: boolean; message: string }>(`/admin/checkup/backup/restore/${filename}`, {});
  },

  restoreFromUpload: async (file: File): Promise<{ success: boolean; message: string }> => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/admin/checkup/backup/restore-upload`, {
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
