import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomSelect } from './CustomSelect';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B', disabled: true },
];

describe('CustomSelect', () => {
  it('apre e seleziona un’opzione', () => {
    const onChange = vi.fn();
    render(
      <CustomSelect options={options} value="" onChange={onChange} placeholder="Seleziona..." />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Seleziona/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Option A' }));

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('gestisce tastiera e click esterno', () => {
    const onChange = vi.fn();
    render(
      <CustomSelect options={options} value="" onChange={onChange} placeholder="Seleziona..." />,
    );

    const trigger = screen.getByRole('button', { name: /Seleziona/i });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Option A' })).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: 'Option A' })).toBeNull();

    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: 'Option A' })).toBeNull();
  });

  it('non seleziona l’opzione disabilitata', () => {
    const onChange = vi.fn();
    render(
      <CustomSelect options={options} value="" onChange={onChange} placeholder="Seleziona..." />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Seleziona/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Option B' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('mostra lo stato di caricamento', () => {
    render(
      <CustomSelect options={options} value="" onChange={() => undefined} loading />,
    );

    expect(screen.getByText('Caricamento...')).toBeInTheDocument();
  });
});
