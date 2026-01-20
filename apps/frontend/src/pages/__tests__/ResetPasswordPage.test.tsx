import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from '../ResetPasswordPage';
import { authApi } from '../../api/auth';

const navigateMock = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('../../api/auth', () => ({
  authApi: {
    confirmPasswordReset: vi.fn(),
  },
}));

vi.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({
    success: toastSuccess,
    error: toastError,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invia la richiesta di reset e torna al login', async () => {
    (authApi.confirmPasswordReset as vi.Mock).mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={['/reset?email=test@example.com&token=abc']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    const passwordFields = document.querySelectorAll('input[type="password"]');
    const newPasswordInput = passwordFields[0] as HTMLInputElement | undefined;
    const confirmPasswordInput = passwordFields[1] as HTMLInputElement | undefined;
    expect(newPasswordInput).toBeTruthy();
    expect(confirmPasswordInput).toBeTruthy();
    if (newPasswordInput && confirmPasswordInput) {
      fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    }

    const saveButton = screen.getByRole('button', { name: /Salva/i });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(authApi.confirmPasswordReset).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: 'abc',
        newPassword: 'password123',
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith('Password aggiornata');
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('torna al login dal link', () => {
    render(
      <MemoryRouter initialEntries={['/reset']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Torna al login/i }));
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('mostra errore quando il reset fallisce', async () => {
    (authApi.confirmPasswordReset as vi.Mock).mockRejectedValueOnce(new Error('fail'));

    render(
      <MemoryRouter initialEntries={['/reset?email=test@example.com&token=abc']}>
        <ResetPasswordPage />
      </MemoryRouter>,
    );

    const passwordFields = document.querySelectorAll('input[type="password"]');
    const newPasswordInput = passwordFields[0] as HTMLInputElement | undefined;
    const confirmPasswordInput = passwordFields[1] as HTMLInputElement | undefined;
    if (newPasswordInput && confirmPasswordInput) {
      fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    }

    fireEvent.click(screen.getByRole('button', { name: /Salva/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('fail');
    });
  });
});
