/**
 * ConfirmDialog — a small, accessible confirmation modal for destructive /
 * progress-losing actions (e.g. leaving an in-progress build via the Home
 * button). Presentational: the consumer owns the open state and the handlers.
 */
import { useEffect } from 'react';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Esc cancels; lock background scroll while the dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onCancel]);

  return (
    <div className="confirm" role="dialog" aria-modal="true" aria-label={title} onClick={onCancel}>
      <div className="confirm__card" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm__title">{title}</h2>
        {body && <p className="confirm__body">{body}</p>}
        <div className="confirm__actions">
          <button className="confirm__cancel" onClick={onCancel} autoFocus>{cancelLabel}</button>
          <button className="confirm__confirm" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
