import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border border-green-200',
  processing: 'bg-blue-100 text-blue-800 border border-blue-200',
  in_transit: 'bg-sky-100 text-sky-800 border border-sky-200',
  out_for_delivery: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  arrived_at_location: 'bg-purple-100 text-purple-800 border border-purple-200',
  delivered: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  cancelled: 'bg-red-100 text-red-800 border border-red-200',
  awaiting_payment: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  under_review: 'bg-orange-100 text-orange-800 border border-orange-200',
  rejected: 'bg-red-100 text-red-800 border border-red-200',
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  status?: string;
  label?: string;
}

export function StatusBadge({ className, status, label, ...props }: StatusBadgeProps) {
  const formattedLabel = label || status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <div className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
      STATUS_STYLES[status || 'pending'] || 'bg-slate-100 text-slate-700 border border-slate-200',
      className,
    )} {...props}>
      {formattedLabel}
    </div>
  );
}
