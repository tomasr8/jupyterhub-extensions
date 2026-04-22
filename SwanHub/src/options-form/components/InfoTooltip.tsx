import { useEffect, useRef } from 'react';

// Bootstrap's Tooltip is imperative. We initialize it on mount and dispose
// on unmount. Re-initializes when the title changes.
//
// Bootstrap 5 is attached to `window.bootstrap` by JupyterHub's base
// templates; we don't bundle it ourselves.

type BootstrapTooltip = { dispose(): void };
type BootstrapTooltipCtor = new (el: Element, opts?: { title: string }) => BootstrapTooltip;

declare global {
  interface Window {
    bootstrap?: { Tooltip: BootstrapTooltipCtor };
  }
}

export function InfoTooltip({ title }: { title: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    const Ctor = window.bootstrap?.Tooltip;
    if (!el || !Ctor) return;
    const tooltip = new Ctor(el, { title });
    return () => tooltip.dispose();
  }, [title]);

  return (
    <i
      ref={ref}
      className="fa fa-info-circle ms-1 text-body-tertiary"
      data-bs-toggle="tooltip"
      title={title}
    />
  );
}
