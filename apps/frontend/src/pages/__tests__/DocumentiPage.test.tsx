import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('../../api/documenti', () => ({
  documentiApi: {
    getAll: vi.fn().mockResolvedValue([]),
    getAllByCartella: vi.fn().mockResolvedValue([]),
    upload: vi.fn().mockResolvedValue({}),
    download: vi.fn().mockResolvedValue({}),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../api/cartelle', () => ({
  cartelleApi: {
    getAll: vi.fn().mockResolvedValue([]),
    getAncestors: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../api/pratiche', () => ({
  fetchPratiche: vi.fn().mockResolvedValue([]),
  getDebitoreDisplayName: vi.fn().mockReturnValue(''),
}));

vi.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

import { DocumentiPage } from '../DocumentiPage';
import { documentiApi } from '../../api/documenti';
import { cartelleApi } from '../../api/cartelle';
import { fetchPratiche } from '../../api/pratiche';

describe('DocumentiPage upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  });

  it('carica un documento dopo la selezione del file', async () => {
    render(<DocumentiPage />);

    await screen.findByRole('heading', { name: 'Documenti', level: 1 });

    fireEvent.click(screen.getByRole('button', { name: /Carica Documento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadButton = screen.getByRole('button', { name: /^Carica$/i });
    expect(uploadButton).toBeEnabled();
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(documentiApi.upload).toHaveBeenCalled();
    });

    const payload = (documentiApi.upload as unknown as { mock: { calls: Array<[any]> } }).mock.calls[0][0];
    expect(payload.file).toBe(file);
    expect(payload.nome).toBe('test.pdf');
  });

  it('mostra errore quando il file supera il limite', async () => {
    vi.stubEnv('VITE_UPLOAD_DOCUMENT_MAX_MB', '0.0001');

    render(<DocumentiPage />);

    await screen.findByRole('heading', { name: 'Documenti', level: 1 });

    fireEvent.click(screen.getByRole('button', { name: /Carica Documento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File([new Uint8Array(1024)], 'big.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Il file supera il limite massimo di 0.0001 MB',
      );
    });

    const uploadButton = screen.getByRole('button', { name: /^Carica$/i });
    expect(uploadButton).toBeDisabled();
    expect(fileInput.value).toBe('');

    vi.unstubAllEnvs();
  });

  it('mostra errore se l\'upload fallisce', async () => {
    (documentiApi.upload as vi.Mock).mockRejectedValueOnce(new Error('boom'));

    render(<DocumentiPage />);

    await screen.findByRole('heading', { name: 'Documenti', level: 1 });

    fireEvent.click(screen.getByRole('button', { name: /Carica Documento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'err.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /^Carica$/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Errore durante l\'upload del file');
    });
  });

  it('annulla l\'upload e resetta la form', async () => {
    render(<DocumentiPage />);

    await screen.findByRole('heading', { name: 'Documenti', level: 1 });

    fireEvent.click(screen.getByRole('button', { name: /Carica Documento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'reset.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /^Annulla$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Carica$/i })).not.toBeInTheDocument();
    });
  });
});

describe('DocumentiPage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  });

  it('scarica un documento', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-1',
        nome: 'Doc A',
        nomeOriginale: 'doc-a.pdf',
        tipo: 'pdf',
        dimensione: 1024,
      },
    ]);

    render(<DocumentiPage />);

    await waitFor(() => {
      expect(documentiApi.getAll).toHaveBeenCalled();
    });
    const docs = await screen.findAllByText('Doc A');
    expect(docs.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTitle('Scarica'));

    await waitFor(() => {
      expect(documentiApi.download).toHaveBeenCalledWith('doc-1');
    });
  });

  it('elimina un documento', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-2',
        nome: 'Doc B',
        nomeOriginale: 'doc-b.pdf',
        tipo: 'pdf',
        dimensione: 2048,
      },
    ]);

    render(<DocumentiPage />);

    await waitFor(() => {
      expect(documentiApi.getAll).toHaveBeenCalled();
    });
    const docs = await screen.findAllByText('Doc B');
    expect(docs.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTitle('Elimina'));

    await waitFor(() => {
      expect(documentiApi.delete).toHaveBeenCalledWith('doc-2');
    });
  });

  it('mostra errore se l\'eliminazione documento fallisce', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-err',
        nome: 'Doc Errore',
        nomeOriginale: 'doc-err.pdf',
        tipo: 'pdf',
        dimensione: 1024,
      },
    ]);
    (documentiApi.delete as vi.Mock).mockRejectedValueOnce(new Error('boom'));

    render(<DocumentiPage />);

    await screen.findAllByText('Doc Errore');
    fireEvent.click(screen.getByTitle('Elimina'));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Errore durante l\'eliminazione del documento');
    });
  });

  it('non elimina un documento se la conferma e negativa', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-4',
        nome: 'Doc D',
        nomeOriginale: 'doc-d.pdf',
        tipo: 'pdf',
        dimensione: 1024,
      },
    ]);
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

    render(<DocumentiPage />);

    await waitFor(() => {
      expect(documentiApi.getAll).toHaveBeenCalled();
    });
    await screen.findAllByText('Doc D');

    fireEvent.click(screen.getByTitle('Elimina'));

    await waitFor(() => {
      expect(documentiApi.delete).not.toHaveBeenCalled();
    });
  });

  it('crea una cartella', async () => {
    render(<DocumentiPage />);

    await screen.findByRole('heading', { name: 'Documenti', level: 1 });

    fireEvent.click(screen.getByRole('button', { name: /Nuova Cartella/i }));

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Cartella Test' } });

    fireEvent.click(screen.getByRole('button', { name: /^Crea$/i }));

    await waitFor(() => {
      expect(cartelleApi.create).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Cartella Test' }));
    });
  });

  it('modifica una cartella esistente', async () => {
    (cartelleApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'cart-3',
        nome: 'Cartella Edit',
        colore: '#3b82f6',
        cartellaParent: null,
        documenti: [],
      },
    ]);

    render(<DocumentiPage />);

    await screen.findByTitle('Modifica cartella');
    fireEvent.click(screen.getByTitle('Modifica cartella'));

    expect(screen.getByText('Modifica Cartella')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Cartella Nuova' } });

    fireEvent.click(screen.getByRole('button', { name: /^Salva$/i }));

    await waitFor(() => {
      expect(cartelleApi.update).toHaveBeenCalledWith('cart-3', expect.objectContaining({ nome: 'Cartella Nuova' }));
    });
  });

  it('elimina una cartella', async () => {
    (cartelleApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'cart-1',
        nome: 'Cartella Uno',
        colore: '#3b82f6',
        cartellaParent: null,
        documenti: [],
      },
    ]);

    render(<DocumentiPage />);

    await waitFor(() => {
      expect(cartelleApi.getAll).toHaveBeenCalled();
    });
    await screen.findByTitle('Elimina cartella');

    fireEvent.click(screen.getByTitle('Elimina cartella'));

    await waitFor(() => {
      expect(cartelleApi.delete).toHaveBeenCalledWith('cart-1');
    });
  });

  it('non elimina la cartella se la conferma e negativa', async () => {
    (cartelleApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'cart-5',
        nome: 'Cartella No',
        colore: '#3b82f6',
        cartellaParent: null,
        documenti: [],
      },
    ]);
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

    render(<DocumentiPage />);

    await screen.findByTitle('Elimina cartella');
    fireEvent.click(screen.getByTitle('Elimina cartella'));

    await waitFor(() => {
      expect(cartelleApi.delete).not.toHaveBeenCalled();
    });
  });

  it('chiude la modal cartella senza salvare', async () => {
    render(<DocumentiPage />);

    await screen.findByRole('heading', { name: 'Documenti', level: 1 });

    fireEvent.click(screen.getByRole('button', { name: /Nuova Cartella/i }));
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Temp' } });
    fireEvent.click(screen.getByRole('button', { name: /^Annulla$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Crea$/i })).not.toBeInTheDocument();
    });
  });

  it('gestisce errore eliminazione cartella con verifica successo', async () => {
    (cartelleApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValueOnce([
      {
        id: 'cart-2',
        nome: 'Cartella Due',
        colore: '#3b82f6',
        cartellaParent: null,
        documenti: [],
      },
    ]);
    (cartelleApi.delete as vi.Mock).mockRejectedValueOnce(new Error('boom'));
    (cartelleApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValueOnce([]);

    render(<DocumentiPage />);

    await screen.findByTitle('Elimina cartella');
    fireEvent.click(screen.getByTitle('Elimina cartella'));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Cartella eliminata');
    });
  });

  it('sposta un documento in un\'altra cartella', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-3',
        nome: 'Doc C',
        nomeOriginale: 'doc-c.pdf',
        tipo: 'pdf',
        dimensione: 1024,
        cartellaId: null,
      },
    ]);
    (cartelleApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      { id: 'cart-1', nome: 'Cartella Origine' },
      { id: 'cart-2', nome: 'Cartella Destinazione' },
    ]);

    render(<DocumentiPage />);

    await waitFor(() => {
      expect(documentiApi.getAll).toHaveBeenCalled();
    });
    const docs = await screen.findAllByText('Doc C');
    expect(docs.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTitle('Sposta documento'));

    const label = await screen.findByText('Cartella di destinazione');
    const selectButton = label.parentElement?.querySelector('button');
    expect(selectButton).toBeTruthy();
    if (selectButton) {
      fireEvent.click(selectButton);
    }

    await screen.findByRole('button', { name: 'Cartella Destinazione' });
    fireEvent.click(screen.getByRole('button', { name: 'Cartella Destinazione' }));

    const moveButtons = screen.getAllByRole('button', { name: /^Sposta$/i });
    fireEvent.click(moveButtons[moveButtons.length - 1]);

    await waitFor(() => {
      expect(documentiApi.update).toHaveBeenCalledWith('doc-3', { cartellaId: 'cart-2' });
    });
  });

  it('chiude la modal spostamento senza salvare', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-9',
        nome: 'Doc Move',
        nomeOriginale: 'doc-move.pdf',
        tipo: 'pdf',
        dimensione: 1024,
        cartellaId: null,
      },
    ]);
    (cartelleApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      { id: 'cart-9', nome: 'Cartella Test' },
    ]);

    render(<DocumentiPage />);

    await screen.findAllByText('Doc Move');
    fireEvent.click(screen.getByTitle('Sposta documento'));

    fireEvent.click(screen.getByRole('button', { name: /^Annulla$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Sposta Documento')).not.toBeInTheDocument();
    });
  });

  it('mostra errore se lo spostamento fallisce', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-5',
        nome: 'Doc E',
        nomeOriginale: 'doc-e.pdf',
        tipo: 'pdf',
        dimensione: 1024,
        cartellaId: null,
      },
    ]);
    (cartelleApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      { id: 'cart-3', nome: 'Cartella Target' },
    ]);
    (documentiApi.update as vi.Mock).mockRejectedValueOnce(new Error('err'));

    render(<DocumentiPage />);

    await screen.findAllByText('Doc E');
    fireEvent.click(screen.getByTitle('Sposta documento'));

    const label = await screen.findByText('Cartella di destinazione');
    const selectButton = label.parentElement?.querySelector('button');
    if (selectButton) {
      fireEvent.click(selectButton);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Cartella Target' }));

    const moveButtons = screen.getAllByRole('button', { name: /^Sposta$/i });
    fireEvent.click(moveButtons[moveButtons.length - 1]);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Errore durante lo spostamento del documento');
    });
  });

  it('apre la modal documento e scarica', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-6',
        nome: 'Doc F',
        nomeOriginale: 'doc-f.pdf',
        tipo: 'pdf',
        dimensione: 2048,
        dataCreazione: new Date().toISOString(),
      },
    ]);

    render(<DocumentiPage />);

    await screen.findAllByText('Doc F');
    fireEvent.click(screen.getByTitle('Apri documento'));

    await screen.findByText(/Anteprima non disponibile/i);
    const scaricaButtons = screen.getAllByRole('button', { name: /Scarica/i });
    fireEvent.click(scaricaButtons[scaricaButtons.length - 1]);

    await waitFor(() => {
      expect(documentiApi.download).toHaveBeenCalledWith('doc-6');
    });
  });

  it('apre una cartella e apre un documento interno', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([]);
    (cartelleApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'cart-4',
        nome: 'Cartella Interna',
        colore: '#3b82f6',
        cartellaParent: null,
        documenti: [],
      },
    ]);
    (documentiApi.getAllByCartella as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-7',
        nome: 'Doc Interno',
        nomeOriginale: 'doc-int.pdf',
        tipo: 'pdf',
        dimensione: 1024,
        dataCreazione: new Date().toISOString(),
      },
    ]);

    render(<DocumentiPage />);

    const openButton = await screen.findByRole('button', { name: /^Apri$/i });
    fireEvent.click(openButton);

    await screen.findByRole('heading', { name: 'Cartella Interna', level: 2 });

    const apriButtons = screen.getAllByRole('button', { name: /^Apri$/i });
    fireEvent.click(apriButtons[apriButtons.length - 1]);

    await screen.findByText(/Anteprima non disponibile/i);
  });

  it('gestisce errore download documento', async () => {
    (documentiApi.getAll as unknown as { mockResolvedValue: (v: any) => void }).mockResolvedValue([
      {
        id: 'doc-8',
        nome: 'Doc Error',
        nomeOriginale: 'doc-error.pdf',
        tipo: 'pdf',
        dimensione: 1024,
      },
    ]);
    (documentiApi.download as vi.Mock).mockRejectedValueOnce(new Error('boom'));

    render(<DocumentiPage />);

    await screen.findAllByText('Doc Error');
    fireEvent.click(screen.getByTitle('Scarica'));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Errore durante il download del file');
    });
  });

  it('rimuove il filtro pratica dalla empty state', async () => {
    (fetchPratiche as vi.Mock).mockResolvedValueOnce([
      {
        id: 'prac-1',
        cliente: { ragioneSociale: 'Cliente A' },
        debitore: null,
      },
    ]);

    render(<DocumentiPage />);

    await screen.findByRole('heading', { name: 'Documenti', level: 1 });

    const filterButton = screen.getByRole('button', { name: /Tutte le pratiche/i });
    fireEvent.click(filterButton);
    fireEvent.click(screen.getByRole('button', { name: 'Cliente A' }));

    const removeButton = await screen.findByRole('button', { name: /Rimuovi filtro pratica/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Rimuovi filtro pratica/i })).not.toBeInTheDocument();
    });
  });
});
