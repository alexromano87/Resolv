// apps/frontend/src/features/clienti/useClientiPage.ts
import { useEffect, useState } from 'react';
import type { Cliente } from '../../api/clienti';
import {
  fetchClienti,
  createCliente,
  updateCliente,
  deleteCliente,
} from '../../api/clienti';

import {
  CLIENTE_INITIAL_FORM,
  type ClienteFormState,
} from './constants';

import { useToast } from '../../components/ui/ToastProvider';

export function useClientiPage() {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ClienteFormState>(CLIENTE_INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = editingId !== null;

  const totalClienti = clienti.length;

  const { success: toastSuccess, error: toastError } = useToast();

  // ===========================
  // LOAD CLIENTI
  // ===========================
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchClienti();
        setClienti(data);
      } catch (e: any) {
        const msg = e.message ?? 'Errore nel recupero dei clienti';
        setError(msg);
        toastError(msg, 'Errore caricamento clienti');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toastError]);

  // ===========================
  // FORM HANDLERS
  // ===========================
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(CLIENTE_INITIAL_FORM);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.ragioneSociale.trim()) {
      const msg = 'La ragione sociale è obbligatoria';
      setError(msg);
      toastError(msg, 'Dati non validi');
      return;
    }

    try {
      setError(null);

      if (isEditing && editingId) {
        // UPDATE
        const aggiornato = await updateCliente(editingId, {
          ...form,
          codiceFiscale: undefined,
        } as any);

        setClienti((prev) =>
          prev.map((c) => (c.id === aggiornato.id ? aggiornato : c)),
        );

        toastSuccess(
          `Cliente "${aggiornato.ragioneSociale}" aggiornato correttamente.`,
          'Cliente aggiornato',
        );
      } else {
        // CREATE
        const nuovo = await createCliente({
          ...form,
          codiceFiscale: undefined,
        } as any);

        setClienti((prev) => [nuovo, ...prev]);

        toastSuccess(
          `Cliente "${nuovo.ragioneSociale}" creato correttamente.`,
          'Cliente creato',
        );
      }

      resetForm();
    } catch (e: any) {
      const msg =
        e.message ??
        (isEditing
          ? 'Errore nell’aggiornamento del cliente'
          : 'Errore nella creazione del cliente');

      setError(msg);
      toastError(
        msg,
        isEditing ? 'Errore aggiornamento' : 'Errore creazione',
      );
    }
  };

  // ===========================
  // SELEZIONE & DELETE
  // ===========================
  const handleSelectCliente = (cliente: Cliente) => {
    const anyCliente = cliente as any;

    setEditingId(cliente.id);
    setForm({
      ragioneSociale: cliente.ragioneSociale ?? '',
      partitaIva: cliente.partitaIva ?? '',

      sedeLegale: anyCliente.sedeLegale ?? '',
      sedeOperativa: anyCliente.sedeOperativa ?? '',

      indirizzo: cliente.indirizzo ?? '',
      cap: cliente.cap ?? '',
      citta: cliente.citta ?? '',
      provincia: cliente.provincia ?? '',
      nazione: cliente.nazione ?? 'IT',

      tipologia: anyCliente.tipologia ?? '',
      referente: anyCliente.referente ?? '',

      telefono: cliente.telefono ?? '',
      email: cliente.email ?? '',
      pec: anyCliente.pec ?? '',
    });

    setError(null);
  };

  const handleDeleteCliente = async (cliente: Cliente) => {
    const conferma = window.confirm(
      `Eliminare il cliente "${cliente.ragioneSociale}"?`,
    );
    if (!conferma) return;

    try {
      setError(null);
      await deleteCliente(cliente.id);
      setClienti((prev) => prev.filter((c) => c.id !== cliente.id));

      if (editingId === cliente.id) {
        resetForm();
      }

      toastSuccess(
        `Cliente "${cliente.ragioneSociale}" eliminato correttamente.`,
        'Cliente eliminato',
      );
    } catch (e: any) {
      const msg =
        e.message ?? 'Errore inatteso durante l’eliminazione del cliente';
      setError(msg);
      toastError(msg, 'Errore eliminazione');
    }
  };

  return {
    // state
    clienti,
    loading,
    error,
    form,
    isEditing,
    editingId,
    totalClienti,

    // setters / actions
    setError,
    handleChange,
    handleSubmit,
    handleSelectCliente,
    handleDeleteCliente,
    resetForm,
  };
}
