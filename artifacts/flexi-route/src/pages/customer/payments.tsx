import React, { useState } from 'react';
import { useListPayments, useGetWallets, useUpdatePayment, useUploadPaymentProof } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DollarSign, Copy, Upload, Loader2, CreditCard, Clock, Link as LinkIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Payments() {
  const { data: paymentsResponse, isLoading } = useListPayments();
  const { data: wallets } = useGetWallets();
  
  const payments = paymentsResponse?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Payments</h1>
          <p className="text-gray-500 mt-1">Manage your shipment payments and crypto transactions.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : payments.length === 0 ? (
        <Card className="border-dashed shadow-none bg-gray-50/50">
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary">No payments history</h3>
            <p className="text-gray-500">You don't have any payments yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {payments.map(payment => (
            <Card key={payment.id} className="overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Payment for Shipment #{payment.shipmentId}</p>
                    <p className="font-bold text-xl text-secondary">${payment.amount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={payment.status as any} />
                  <span className="text-sm text-gray-400">|</span>
                  <span className="text-sm text-gray-500">{format(new Date(payment.createdAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Currency Selected</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md font-mono text-sm font-semibold">
                        {payment.currency}
                      </div>
                    </div>
                    {payment.status === 'awaiting_payment' && wallets && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Send funds to this address:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 block p-3 bg-gray-100 rounded-lg text-sm break-all border border-gray-200">
                            {wallets[payment.currency as keyof typeof wallets] || 'Address unavailable'}
                          </code>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {
                              const addr = wallets[payment.currency as keyof typeof wallets];
                              if (addr) {
                                navigator.clipboard.writeText(addr);
                                toast.success("Address copied to clipboard!");
                              }
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {(payment.txid || payment.paymentProofUrl) && (
                      <div className="pt-4 border-t border-gray-100 space-y-3">
                        {payment.txid && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Transaction ID (TXID)</p>
                            <p className="font-mono text-sm mt-1 truncate">{payment.txid}</p>
                          </div>
                        )}
                        {payment.paymentProofUrl && (
                          <div>
                            <a href={payment.paymentProofUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 inline-flex">
                              <LinkIcon className="h-4 w-4" /> View Payment Proof
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {payment.adminNotes && payment.status === 'rejected' && (
                      <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm mt-4">
                        <span className="font-bold">Rejection Reason:</span> {payment.adminNotes}
                      </div>
                    )}
                  </div>
                  
                  {payment.status === 'awaiting_payment' && (
                    <div className="w-full md:w-1/3 bg-gray-50 rounded-xl p-5 border border-gray-200">
                      <SubmitProofForm paymentId={payment.id} />
                    </div>
                  )}
                  {payment.status === 'under_review' && (
                    <div className="w-full md:w-1/3 bg-orange-50/50 rounded-xl p-5 border border-orange-100 flex flex-col items-center justify-center text-center">
                      <Clock className="h-8 w-8 text-orange-400 mb-3" />
                      <p className="font-medium text-orange-800">Verification in Progress</p>
                      <p className="text-sm text-orange-600 mt-1">Our team is reviewing your transaction. This usually takes a few hours.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitProofForm({ paymentId }: { paymentId: number }) {
  const [txid, setTxid] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const updatePayment = useUpdatePayment();
  const uploadProof = useUploadPaymentProof();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txid && !file) {
      toast.error("Please provide either a TXID or a payment proof image.");
      return;
    }

    try {
      if (txid) {
        await updatePayment.mutateAsync({ id: paymentId, data: { txid, status: 'under_review' } });
      }
      
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        // Upload proof is typed as any if not strictly defined for FormData in orval,
        // we'll use custom mutate options if needed, but passing FormData directly usually works.
        await uploadProof.mutateAsync({ id: paymentId, data: formData as any });
      }

      toast.success("Payment proof submitted successfully!");
      // reload or invalidate
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to submit proof");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-secondary mb-2">Submit Proof</h3>
      <div>
        <label className="text-sm font-medium text-gray-700">Transaction ID</label>
        <Input 
          value={txid} 
          onChange={e => setTxid(e.target.value)} 
          placeholder="0x..." 
          className="mt-1 bg-white"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Screenshot / Receipt</label>
        <Input 
          type="file" 
          accept="image/*,.pdf" 
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="mt-1 bg-white cursor-pointer"
        />
      </div>
      <Button type="submit" className="w-full mt-2" disabled={updatePayment.isPending || uploadProof.isPending}>
        {(updatePayment.isPending || uploadProof.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit for Review
      </Button>
    </form>
  );
}
