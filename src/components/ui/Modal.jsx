/**
 * Modal — dialogue accessible avec focus trap
 *
 * Usage :
 *   const [open, setOpen] = useState(false);
 *
 *   <Modal open={open} onClose={() => setOpen(false)} title="Abandonner le quiz ?">
 *     <p>Ta progression sera perdue.</p>
 *     <Modal.Footer>
 *       <Button onClick={() => setOpen(false)}>Annuler</Button>
 *       <Button variant="danger" onClick={handleConfirm}>Abandonner</Button>
 *     </Modal.Footer>
 *   </Modal>
 */

import { useCallback, useEffect, useRef } from 'react';

const Modal = ({
  open = false,
  onClose,
  title,
  description,
  size = 'md',
  children,
  closeOnOverlay = true,
}) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  const SIZE_CLASSES = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      setTimeout(() => dialogRef.current?.focus(), 50);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        aria-hidden="true"
        onClick={closeOnOverlay ? onClose : undefined}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-desc' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={[
          'relative w-full bg-white dark:bg-gray-900 rounded-xl',
          'border border-gray-100 dark:border-gray-800',
          'outline-none',
          SIZE_CLASSES[size],
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          {title && (
            <h2 id="modal-title" className="text-base font-medium text-gray-900 dark:text-white">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="ml-auto p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {description && (
            <p id="modal-desc" className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

Modal.Footer = ({ children }) => (
  <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
    {children}
  </div>
);

export default Modal;
