/**
 * Tabs — navigation par onglets accessible (ARIA tabs pattern)
 *
 * Usage contrôlé (externe) :
 *   const [tab, setTab] = useState('overview');
 *   <Tabs value={tab} onChange={setTab} tabs={[
 *     { id: 'overview', label: 'Vue d\'ensemble' },
 *     { id: 'curriculum', label: 'Curriculum', badge: 12 },
 *     { id: 'discussions', label: 'Discussions' },
 *   ]} />
 *
 * Usage non contrôlé (interne) :
 *   <Tabs defaultValue="overview" tabs={[...]} />
 *
 * Variante avec contenu :
 *   <TabPanel value={tab} tab="overview">...</TabPanel>
 */

import { useState } from 'react';

export const Tabs = ({
  tabs = [],
  value,
  defaultValue,
  onChange,
  className = '',
  variant = 'underline',
}) => {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id);
  const active = value ?? internal;

  const handleSelect = (id) => {
    if (!value) setInternal(id);
    onChange?.(id);
  };

  const isUnderline = variant === 'underline';

  return (
    <div
      role="tablist"
      aria-label="Navigation"
      className={[
        'flex gap-1',
        isUnderline
          ? 'border-b border-gray-200 dark:border-gray-800'
          : 'bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
        className,
      ].join(' ')}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => handleSelect(tab.id)}
            className={[
              'inline-flex items-center gap-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              isUnderline
                ? [
                    'px-1 pb-3 pt-1 -mb-px border-b-2',
                    isActive
                      ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                  ].join(' ')
                : [
                    'px-3 py-1.5 rounded-md',
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                  ].join(' '),
            ].join(' ')}
          >
            {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
            {tab.label}
            {tab.badge != null && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-medium">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const TabPanel = ({ value, tab, children, className = '' }) => {
  if (value !== tab) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${tab}`}
      aria-labelledby={`tab-${tab}`}
      tabIndex={0}
      className={['focus-visible:outline-none', className].join(' ')}
    >
      {children}
    </div>
  );
};

export default Tabs;
