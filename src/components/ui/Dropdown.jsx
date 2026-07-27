/**
 * Dropdown — menu contextuel accessible (click ou keyboard)
 *
 * Usage :
 *   <Dropdown
 *     trigger={<Button rightIcon={<ChevronDown />}>Actions</Button>}
 *     items={[
 *       { label: 'Modifier', icon: <EditIcon />, onClick: handleEdit },
 *       { label: 'Télécharger', icon: <DownloadIcon />, onClick: handleDownload },
 *       { type: 'separator' },
 *       { label: 'Supprimer', icon: <TrashIcon />, onClick: handleDelete, variant: 'danger' },
 *     ]}
 *   />
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const Dropdown = ({
  trigger,
  items = [],
  align = 'left',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  const actionItems = items.filter((i) => i.type !== 'separator');

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIdx(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
        setFocusedIdx(0);
      }
      return;
    }
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, actionItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      actionItems[focusedIdx]?.onClick?.();
      close();
    }
  };

  useEffect(() => {
    if (open && focusedIdx >= 0) {
      menuRef.current?.querySelectorAll('[role="menuitem"]')[focusedIdx]?.focus();
    }
  }, [open, focusedIdx]);

  return (
    <div
      ref={containerRef}
      className={['relative inline-block', className].join(' ')}
      onKeyDown={handleKeyDown}
    >
      <div onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        {trigger}
      </div>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menu contextuel"
          className={[
            'absolute z-50 mt-1.5 min-w-[160px] py-1',
            'bg-white dark:bg-gray-900',
            'border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-sm',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {items.map((item, i) => {
            if (item.type === 'separator') {
              return (
                <div key={i} className="my-1 border-t border-gray-100 dark:border-gray-800" role="separator" />
              );
            }
            return (
              <button
                key={i}
                role="menuitem"
                tabIndex={-1}
                disabled={item.disabled}
                onClick={() => { item.onClick?.(); close(); }}
                className={[
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left',
                  'transition-colors focus:outline-none',
                  item.variant === 'danger'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 focus:bg-red-50 dark:focus:bg-red-950/50'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-800',
                  item.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
                ].join(' ')}
              >
                {item.icon && (
                  <span className="w-4 h-4 shrink-0" aria-hidden="true">{item.icon}</span>
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
