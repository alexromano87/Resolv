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

  it('carica automaticamente le notifiche quando apro la pagina', async () => {
    render(
      <MemoryRouter initialEntries={['/checkup/notifiche-sistema']}>
        <Routes>
          <Route path="/checkup/notifiche-sistema" element={<SystemNotificationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getSystemNotifications).toHaveBeenCalledTimes(1);
    });
    expect(getSystemNotifications).toHaveBeenCalledWith({
      query: undefined,
      read: 'unread',
      notificationId: undefined,
      limit: 20,
      page: 1,
    });
  });

  it('esegue una nuova fetch quando clicco Aggiorna', async () => {
    render(
      <MemoryRouter initialEntries={['/checkup/notifiche-sistema']}>
        <Routes>
          <Route path="/checkup/notifiche-sistema" element={<SystemNotificationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getSystemNotifications).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /aggiorna/i }));

    await waitFor(() => {
      expect(getSystemNotifications).toHaveBeenCalledTimes(2);
    });
    expect(getSystemNotifications).toHaveBeenCalledWith({
      query: undefined,
      read: 'unread',
      notificationId: undefined,
      limit: 20,
      page: 1,
    });
  });

  it('carica automaticamente la notifica quando e presente notificationId', async () => {
    render(
      <MemoryRouter initialEntries={['/checkup/notifiche-sistema?notificationId=notif-1&type=nota_cliente&query=testo']}>
        <Routes>
          <Route path="/checkup/notifiche-sistema" element={<SystemNotificationsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getSystemNotifications).toHaveBeenCalledTimes(1);
    });
    expect(getSystemNotifications).toHaveBeenCalledWith({
      query: undefined,
      read: undefined,
      notificationId: 'notif-1',
      limit: 50,
      page: 1,
    });
  });
});
