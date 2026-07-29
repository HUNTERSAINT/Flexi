import React, { useState } from 'react';
import { useListPayments, useUpdatePayment } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, CheckCircle2, XCircle, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { getListPaymentsQueryKey } from '@workspace/api-client-react';

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { data: paymentsResponse, isLoading } = useListPayments({
    status: statusFilter !== 'all' ? statusFilter as any : undefined
  });

  const payments = paymentsResponse?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Payments Ledger</h1>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
            <SelectItem value="under_review">Under Review (Needs Action)</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 text-gray-500 font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Shipment ID</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-10"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" /></td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-500">No payments found</td></tr>
                ) : payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono font-medium">#{payment.shipmentId}</td>
                    <td className="px-6 py-4 font-bold text-secondary">${payment.amount}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs font-semibold">{payment.currency}</span>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={payment.status as any} /></td>
                    <td className="px-6 py-4 text-gray-500">{format(new Date(payment.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-right">
                      {payment.status === 'under_review' ? (
                        <ReviewAction payment={payment} />
                      ) : payment.status === 'confirmed' ? (
                        <span className="text-green-600 flex justify-end"><CheckCircle2 className="h-5 w-5" /></span>
                      ) : payment.status === 'rejected' ? (
                        <span className="text-red-500 flex justify-end"><XCircle className="h-5 w-5" /></span>
                      ) : (
                        <span className="text-gray-400 text-xs">Waiting</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewAction({ payment }: { payment: any }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const updatePayment = useUpdatePayment();
  const queryClient = useQueryClient();

  const handleAction = async (status: 'confirmed' | 'rejected') => {
    if (status === 'rejected' && !notes) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    
    try {
      await updatePayment.mutateAsync({ 
        id: payment.id, 
        data: { status, adminNotes: notes } 
      });
      queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      toast.success(`Payment ${status}`);
      setOpen(false);
    } catch (e) {
      toast.error("Action failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setOpen(true)}>
        Review Needed
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Payment #{payment.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-secondary text-lg">${payment.amount} {payment.currency}</span>
            </div>
            {payment.txid && (
              <div>
                <p className="text-gray-500 mb-1">Provided TXID:</p>
                <code className="block w-full p-2 bg-white border rounded break-all">{payment.txid}</code>
              </div>
            )}
            {payment.paymentProofUrl && (
              <div>
                <p className="text-gray-500 mb-1">Proof Document:</p>
                <a href={payment.paymentProofUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  <LinkIcon className="h-4 w-4" /> Open Proof File
                </a>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Rejection Reason (Optional for approval)</label>
            <Textarea 
              className="mt-1" 
              placeholder="If rejecting, explain why..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => handleAction('rejected')}
              disabled={updatePayment.isPending}
            >
              Reject
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => handleAction('confirmed')}
              disabled={updatePayment.isPending}
            >
              Approve Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
