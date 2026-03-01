import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface BodyPortalProps {
  children: React.ReactNode;
}

export function BodyPortal({ children }: BodyPortalProps) {
  const container = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.className = 'body-portal-root';
    return el;
  }, []);

  useEffect(() => {
    if (!container) return;
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  if (!container) return null;
  return createPortal(children, container);
}
