import React from 'react';

/**
 * Crédito de desenvolvimento idêntico ao padrão do MotoJá
 */
export function DevCredit({ className = '' }) {
  return (
    <p className={`text-[11px] font-medium text-slate-500 text-center tracking-wider select-none ${className}`}>
      desenvolvido por almir.lk
    </p>
  );
}
