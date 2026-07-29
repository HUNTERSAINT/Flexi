import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
  {
    variants: {
      status: {
        // Shipment Statuses
        pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        confirmed: 'bg-green-100 text-green-800 border border-green-200',
        processing: 'bg-blue-100 text-blue-800 border border-blue-200',
        in_transit: 'bg-sky-100 text-sky-800 border border-sky-200',
        out_for_delivery: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
        delivered: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        cancelled: 'bg-red-100 text-red-800 border border-red-200',
        
        // Payment Statuses
        awaiting_payment: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        under_review: 'bg-orange-100 text-orange-800 border border-orange-200',
        rejected: 'bg-red-100 text-red-800 border border-red-200',
      },
    },
    defaultVariants: {
      status: 'pending',
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  label?: string;
}

export function StatusBadge({ className, status, label, ...props }: StatusBadgeProps) {
  const formattedLabel = label || status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <div className={cn(badgeVariants({ status }), className)} {...props}>
      {formattedLabel}
    </div>
  );
}
