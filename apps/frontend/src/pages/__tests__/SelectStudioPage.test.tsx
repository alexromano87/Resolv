import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SelectStudioPage from '../SelectStudioPage';
import { authApi } from '../../api/auth';

const navigateMock = vi.fn();
const setSessionMock = vi.fn();

vi.mock('../../api/auth', () => ({
  authApi: {
    selectStudio: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    setSession: setSessionMock,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('SelectStudioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seleziona lo studio e naviga alla dashboard', async () => {
    (authApi.selectStudio as vi.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/select-studio',
            state: {
              requiresStudioSelection: true,
              userId: 'u1',
              studi: [
                { id: 's1', nome: 'Studio Uno', ragioneSociale: 'Studio Uno SRL' },
              ],
            },
          },
        ]}
      >
        <SelectStudioPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Studio Uno/i }));

    await waitFor(() => {
      expect(authApi.selectStudio).toHaveBeenCalledWith('u1', 's1');
    });
    expect(setSessionMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('torna al login se lo state non e valido', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/select-studio', state: null }]}>
        <SelectStudioPage />
      </MemoryRouter>,
    );

    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('mostra errore se la selezione studio fallisce', async () => {
    (authApi.selectStudio as vi.Mock).mockRejectedValueOnce(new Error('nope'));

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/select-studio',
            state: {
              requiresStudioSelection: true,
              userId: 'u1',
              studi: [
                { id: 's1', nome: 'Studio Uno', ragioneSociale: 'Studio Uno SRL' },
              ],
            },
          },
        ]}
      >
        <SelectStudioPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Studio Uno/i }));

    expect(await screen.findByText('nope')).toBeInTheDocument();
  });
});
