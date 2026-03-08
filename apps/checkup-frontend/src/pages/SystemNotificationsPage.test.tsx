import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SystemNotificationsPage } from './SystemNotificationsPage';

const getSystemNotifications = vi.fn();

vi.mock('../api/me', () => ({
  meApi: {
    getSystemNotifications: (...args: unknown[]) => getSystemNotifications(...args),
  },
}));

describe('SystemNotificationsPage', () => {
  beforeEach(() => {
    getSystemNotifications.mockReset();
    getSystemNotifications.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('non carica automaticamente le notifiche quando apro la pagina', () => {
    render(
      <MemoryRouter initialEntries={['/checkup/notifiche-sistema']}>
        <Routes>
          <Route path="/checkup/notifiche-sistema" element={<SystemNotificationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(getSystemNotifications).not.toHaveBeenCalled();
    expect(screen.getByText(/premi Cerca per caricare le notifiche/i)).toBeInTheDocument();
  });

  it('esegue la fetch solo quando clicco Cerca', async () => {
    render(
      <MemoryRouter initialEntries={['/checkup/notifiche-sistema']}>
        <Routes>
          <Route path="/checkup/notifiche-sistema" element={<SystemNotificationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /cerca/i }));

    await waitFor(() => {
      expect(getSystemNotifications).toHaveBeenCalledTimes(1);
    });
    expect(getSystemNotifications).toHaveBeenCalledWith({
      query: undefined,
      type: undefined,
      notificationId: undefined,
      limit: 20,
      page: 1,
    });
  });
});
