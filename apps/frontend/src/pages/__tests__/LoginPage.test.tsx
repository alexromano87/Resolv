import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const loginMock = vi.fn();
const setSessionMock = vi.fn();
const navigateMock = vi.fn();
const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    setSession: setSessionMock,
  }),
}));

vi.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

vi.mock('../../api/auth', () => {
  const verifyTwoFactorLogin = vi.fn();
  const requestPasswordReset = vi.fn();
  return {
    authApi: {
      verifyTwoFactorLogin,
      requestPasswordReset,
    },
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { authApi } from '../../api/auth';
import LoginPage from '../LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('invia le credenziali di login', async () => {
    loginMock.mockResolvedValueOnce({
      user: { ruolo: 'collaboratore' },
    });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Accedi come studio/i }));
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'mypassword' } });
    fireEvent.click(screen.getByRole('button', { name: /Accedi alla piattaforma/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    expect(loginMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'mypassword',
    });
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('gestisce il flusso 2FA', async () => {
    loginMock.mockResolvedValueOnce({
      requiresTwoFactor: true,
      userId: 'u-2fa',
      channel: 'email',
    });
    (authApi.verifyTwoFactorLogin as any).mockResolvedValueOnce({
      user: { ruolo: 'collaboratore' },
    });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Accedi come studio/i }));
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user2@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Accedi alla piattaforma/i }));

    await screen.findByText(/Codice 2FA inviato/i);

    fireEvent.change(screen.getByLabelText(/Codice di verifica/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verifica e accedi/i }));

    await waitFor(() => expect(authApi.verifyTwoFactorLogin).toHaveBeenCalled());
    expect(authApi.verifyTwoFactorLogin).toHaveBeenCalledWith('u-2fa', '123456');
    expect(setSessionMock).toHaveBeenCalled();
  });

  it('mostra errore se la verifica 2FA fallisce', async () => {
    loginMock.mockResolvedValueOnce({
      requiresTwoFactor: true,
      userId: 'u-2fa',
      channel: 'email',
    });
    (authApi.verifyTwoFactorLogin as any).mockRejectedValueOnce({ status: 401 });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Accedi come studio/i }));
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user2@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Accedi alla piattaforma/i }));

    await screen.findByText(/Codice 2FA inviato/i);

    fireEvent.change(screen.getByLabelText(/Codice di verifica/i), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Verifica e accedi/i }));

    await screen.findByText(/Codice non valido o scaduto/i);
  });

  it('mostra errore quando le credenziali non sono valide', async () => {
    loginMock.mockRejectedValueOnce({ status: 401 });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Accedi come studio/i }));
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Accedi alla piattaforma/i }));

    await screen.findByText(/Email o password non corretti/i);
  });

  it('gestisce la selezione studio dopo il login', async () => {
    const response = {
      requiresStudioSelection: true,
      userId: 'u-1',
      studi: [],
    };
    loginMock.mockResolvedValueOnce(response);

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Accedi come studio/i }));
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Accedi alla piattaforma/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/select-studio', { state: response });
    });
  });

  it('naviga all’area admin quando il ruolo e admin', async () => {
    loginMock.mockResolvedValueOnce({
      user: { ruolo: 'admin' },
    });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Accedi come studio/i }));
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Accedi alla piattaforma/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/admin/users');
    });
  });

  it('invia il recupero password e mostra successo', async () => {
    (authApi.requestPasswordReset as vi.Mock).mockResolvedValueOnce({});

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Accedi come studio/i }));
    fireEvent.click(screen.getByRole('button', { name: /Password dimenticata/i }));

    const recoverInputs = screen.getAllByPlaceholderText('nome@studio.it');
    const recoverInput = recoverInputs[recoverInputs.length - 1];
    fireEvent.change(recoverInput, { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Invia link/i }));

    await waitFor(() => {
      expect(authApi.requestPasswordReset).toHaveBeenCalledWith({ email: 'user@example.com' });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('Email inviata con il link di recupero');
  });

  it('mostra errore nel recupero password', async () => {
    (authApi.requestPasswordReset as vi.Mock).mockRejectedValueOnce(new Error('boom'));

    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: /Accedi come studio/i }));
    fireEvent.click(screen.getByRole('button', { name: /Password dimenticata/i }));

    const recoverInputs = screen.getAllByPlaceholderText('nome@studio.it');
    const recoverInput = recoverInputs[recoverInputs.length - 1];
    fireEvent.change(recoverInput, { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Invia link/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('boom');
    });
  });

  it('mostra il modal di inattivita e torna al login', async () => {
    localStorage.setItem('auth_inactivity_logout', '1');

    render(<LoginPage />);

    const modalButton = await screen.findByRole('button', { name: /Vai al login/i });
    fireEvent.click(modalButton);

    expect(navigateMock).toHaveBeenCalledWith('/login');
  });
});
