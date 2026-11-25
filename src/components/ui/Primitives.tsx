import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { CreditNoteStatus, InvoiceStatus } from '../../../shared/types.ts';

export function FatooraLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-9 h-9' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';
  const subTextSize = size === 'lg' ? 'text-[11px]' : 'text-[10px]';
  return (
    <span className="inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0">
      <span
        className={`${iconSize} rounded-lg bg-[#F26522] flex items-center justify-center text-white shrink-0`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
          <path
            d="M4 6.5C4 5.11929 5.11929 4 6.5 4H17.5C18.8807 4 20 5.11929 20 6.5V17.5C20 18.8807 18.8807 20 17.5 20H6.5C5.11929 20 4 18.8807 4 17.5V6.5ZM6.5 6C6.22386 6 6 6.22386 6 6.5V13H9.2L10.4 15H13.6L14.8 13H18V6.5C18 6.22386 17.7761 6 17.5 6H6.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={`${textSize} font-bold tracking-tight text-[#1C1917] leading-tight`}>
          Inbox E-invoicing
        </span>
        <span
          className={`${subTextSize} font-semibold uppercase tracking-[0.14em] text-[#F26522] mt-0.5`}
        >
          Inbox Infotech
        </span>
      </span>
    </span>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-[#F26522] text-white hover:bg-[#E05A1B] active:scale-[0.99]',
    secondary:
      'bg-white text-[#1C1917] border border-[#E7E5E4] hover:bg-[#F5F5F4] active:scale-[0.99]',
    ghost: 'bg-transparent text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917]',
    danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:scale-[0.99]',
  };
  const sizes = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/40 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[#44403C] mb-1.5"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full h-10 bg-white border rounded-md px-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus:outline-none focus:ring-2 ${
          error
            ? 'border-[#DC2626] focus:ring-[#DC2626]/20 focus:border-[#DC2626]'
            : 'border-[#E7E5E4] focus:ring-[#F26522]/20 focus:border-[#F26522]'
        } disabled:bg-[#FAFAF9] disabled:text-[#78716C] ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-[#DC2626] mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#A8A29E] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Select({
  label,
  error,
  helperText,
  className = '',
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-[#44403C] mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full h-10 bg-white border rounded-md px-3 text-sm text-[#1C1917] transition-all focus:outline-none focus:ring-2 ${
          error
            ? 'border-[#DC2626] focus:ring-[#DC2626]/20 focus:border-[#DC2626]'
            : 'border-[#E7E5E4] focus:ring-[#F26522]/20 focus:border-[#F26522]'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs text-[#DC2626] mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#A8A29E] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[#44403C] mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full bg-white border rounded-md px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-all focus:outline-none focus:ring-2 ${
          error
            ? 'border-[#DC2626] focus:ring-[#DC2626]/20 focus:border-[#DC2626]'
            : 'border-[#E7E5E4] focus:ring-[#F26522]/20 focus:border-[#F26522]'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-[#DC2626] mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#A8A29E] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-lg border border-[#E7E5E4] ${className}`}>
      {children}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: InvoiceStatus | CreditNoteStatus | 'ACTIVE' | 'INACTIVE';
}) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    PAID: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', label: 'Paid' },
    ISSUED: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', label: 'Issued' },
    ACTIVE: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', label: 'Active' },
    DELIVERED: { bg: 'bg-[#F0FDF4]', text: 'text-[#16A34A]', label: 'Delivered' },
    SENT: { bg: 'bg-[#FFF3ED]', text: 'text-[#F26522]', label: 'Sent' },
    PARTIALLY_PAID: {
      bg: 'bg-[#FFFBEB]',
      text: 'text-[#D97706]',
      label: 'Partially Paid',
    },
    OVERDUE: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', label: 'Overdue' },
    DRAFT: { bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]', label: 'Draft' },
    VOID: { bg: 'bg-[#F5F5F4]', text: 'text-[#78716C]', label: 'Void' },
    CANCELLED: { bg: 'bg-[#F5F5F4]', text: 'text-[#78716C]', label: 'Cancelled' },
    INACTIVE: { bg: 'bg-[#F5F5F4]', text: 'text-[#78716C]', label: 'Inactive' },
  };
  const cfg = styles[status] || {
    bg: 'bg-[#F5F5F4]',
    text: 'text-[#78716C]',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  maxWidth = 'max-w-lg',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]">
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col border border-[#E7E5E4]`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#F0EEEC]">
          <div>
            <h2 className="text-lg font-semibold text-[#1C1917]">{title}</h2>
            {description && (
              <p className="text-xs text-[#78716C] mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function SlideOver({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E7E5E4] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#F0EEEC]">
          <div>
            <h2 className="text-lg font-semibold text-[#1C1917]">{title}</h2>
            {description && (
              <p className="text-xs text-[#78716C] mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 rounded-md text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#1C1917] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-xl bg-[#FFF3ED] text-[#F26522] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#1C1917]">{title}</h3>
      <p className="text-sm text-[#78716C] max-w-sm mt-1.5">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-[#F0EEEC]">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 px-5 py-4 animate-pulse">
          {Array.from({ length: cols }).map((__, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-[#F5F5F4] rounded flex-1"
              style={{ maxWidth: cIdx === 0 ? '110px' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-[#E7E5E4] p-5 animate-pulse">
      <div className="h-3.5 w-24 bg-[#F5F5F4] rounded mb-3" />
      <div className="h-8 w-36 bg-[#F5F5F4] rounded mb-2" />
      <div className="h-3 w-20 bg-[#F5F5F4] rounded" />
    </div>
  );
}
