import React, { useState, useEffect } from 'react';
import { useSearch } from 'wouter';
import { useTrackShipment } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, MapPin, CheckCircle2, Clock, Truck, Package, AlertCircle, CreditCard, Copy, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';

const CURRENCIES = ['BTC', 'ETH', 'USDT_TRC20', 'USDT_ERC20', 'USDC', 'LTC'] as const;

type PayStep = 'select' | 'address' | 'done';

interface PaymentInfo {
  id: number;
  currency: string;
  walletAddress: string;
  amount: string;
  status: string;
  txid?: string | null;
}

export default function Track() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const initialTracking = searchParams.get('number') || '';

  const [trackingInput, setTrackingInput] = useState(initialTracking);
  const [activeTracking, setActiveTracking] = useState(initialTracking);

  // Payment flow state
  const [payStep, setPayStep] = useState<PayStep>('select');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [txidInput, setTxidInput] = useState('');
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [isPaySubmitting, setIsPaySubmitting] = useState(false);

  const { data: trackingInfo, isLoading, isError, refetch } = useTrackShipment(
    activeTracking,
    { query: { enabled: !!activeTracking, retry: false } }
  );

  // Extended info (new fields from updated API)
  const info = trackingInfo as any;
  const receiverPays: boolean = info?.receiverPays ?? false;
  const existingPayment: PaymentInfo | null = info?.payment ?? null;
  const estimatedAmount: string = info?.estimatedAmount ?? '0.00';

  // If there's already a payment record, jump to the right step
  useEffect(() => {
    if (!existingPayment) return;
    if (existingPayment.status === 'awaiting_payment') {
      setPaymentInfo(existingPayment);
      setSelectedCurrency(existingPayment.currency);
      setPayStep('address');
    } else if (['under_review', 'confirmed'].includes(existingPayment.status)) {
      setPaymentInfo(existingPayment);
      setPayStep('done');
    }
  }, [existingPayment?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingInput.trim()) {
      setActiveTracking(trackingInput.trim());
      window.history.pushState({}, '', `/track?number=${encodeURIComponent(trackingInput.trim())}`);
    }
  };

  useEffect(() => {
    const currentParams = new URLSearchParams(search);
    const num = currentParams.get('number');
    if (num && num !== activeTracking) {
      setTrackingInput(num);
      setActiveTracking(num);
    }
  }, [search]);

  const handleGetAddress = async () => {
    if (!selectedCurrency) { toast.error('Please select a cryptocurrency'); return; }
    setIsPaySubmitting(true);
    try {
      const res = await fetch(`/api/track/${activeTracking}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: selectedCurrency }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      const data = await res.json();
      setPaymentInfo(data);
      setPayStep('address');
    } catch (err: any) {
      toast.error(err.message || 'Could not generate payment address. Try again.');
    } finally {
      setIsPaySubmitting(false);
    }
  };

  const handleSubmitTxid = async () => {
    if (!txidInput.trim()) { toast.error('Please enter your transaction ID'); return; }
    setIsPaySubmitting(true);
    try {
      const res = await fetch(`/api/track/${activeTracking}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid: txidInput.trim() }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      toast.success('Payment submitted! We will confirm it shortly.');
      setPayStep('done');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Could not submit payment. Try again.');
    } finally {
      setIsPaySubmitting(false);
    }
  };

  const copyAddress = () => {
    if (paymentInfo?.walletAddress) {
      navigator.clipboard.writeText(paymentInfo.walletAddress);
      toast.success('Address copied!');
    }
  };

  const needsPayment = receiverPays && info?.status === 'pending' && payStep !== 'done' &&
    (!existingPayment || existingPayment.status === 'awaiting_payment');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary mb-4">Track Your Shipment</h1>
          <p className="text-gray-600 text-lg">Enter your Flexi Route tracking number to see real-time updates.</p>
        </div>

        <Card className="mb-8 border-none shadow-md">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="e.g., FR-123456789"
                  className="pl-12 h-14 text-lg"
                />
              </div>
              <Button type="submit" size="lg" className="h-14 px-8" disabled={isLoading}>
                {isLoading ? 'Tracking...' : 'Track Package'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl flex items-start gap-4">
            <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lg">Shipment Not Found</h3>
              <p className="mt-1">We couldn't find a shipment matching "{activeTracking}". Please check the number and try again.</p>
            </div>
          </div>
        )}

        {trackingInfo && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── Receiver Pays — Payment Section ── */}
            {receiverPays && (
              <Card className="border-2 border-primary/30 shadow-md overflow-hidden">
                <div className="bg-primary/5 border-b border-primary/20 px-6 sm:px-8 py-4 flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-secondary text-lg">Payment Required</h3>
                  {(payStep === 'done' || (existingPayment && existingPayment.status !== 'awaiting_payment')) && (
                    <span className="ml-auto text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                      {existingPayment?.status === 'confirmed' ? 'Payment Confirmed ✓' : 'Under Review'}
                    </span>
                  )}
                </div>
                <CardContent className="p-6 sm:p-8">

                  {/* Step: Done / Under Review */}
                  {(payStep === 'done' || (existingPayment && ['under_review', 'confirmed'].includes(existingPayment.status))) ? (
                    <div className="text-center py-4 space-y-3">
                      <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                      <h4 className="text-xl font-bold text-secondary">
                        {existingPayment?.status === 'confirmed' ? 'Payment Confirmed!' : 'Payment Received — Under Review'}
                      </h4>
                      <p className="text-gray-600 max-w-sm mx-auto">
                        {existingPayment?.status === 'confirmed'
                          ? 'Your payment has been confirmed. The shipment is now being processed.'
                          : 'We received your transaction ID and are verifying the payment. Delivery will proceed once confirmed.'}
                      </p>
                    </div>
                  ) : payStep === 'address' && paymentInfo ? (
                    /* Step: Show Wallet Address */
                    <div className="space-y-6">
                      <div className="bg-secondary/5 border border-secondary/10 rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm font-medium">Amount Due</span>
                          <span className="text-2xl font-bold text-secondary">${estimatedAmount} USD</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm font-medium">Currency</span>
                          <span className="font-semibold text-secondary">{paymentInfo.currency.replace(/_/g, ' ')}</span>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm font-medium mb-2">Send to this wallet address</p>
                          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3">
                            <code className="text-xs text-secondary break-all flex-1 font-mono">{paymentInfo.walletAddress}</code>
                            <button onClick={copyAddress} className="shrink-0 text-gray-400 hover:text-primary transition-colors" title="Copy address">
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                        <strong>Important:</strong> Send exactly the equivalent of <strong>${estimatedAmount} USD</strong> in {paymentInfo.currency.replace(/_/g, ' ')} to the address above. After sending, enter your Transaction ID below.
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-secondary block">Transaction ID (TxID)</label>
                        <div className="flex gap-3">
                          <Input
                            value={txidInput}
                            onChange={(e) => setTxidInput(e.target.value)}
                            placeholder="Paste your transaction hash here"
                            className="h-12 font-mono text-sm"
                          />
                          <Button onClick={handleSubmitTxid} disabled={isPaySubmitting || !txidInput.trim()} className="h-12 px-6 shrink-0">
                            {isPaySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "I've Sent Payment"}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">You can find your Transaction ID in your crypto wallet's transaction history.</p>
                      </div>
                    </div>
                  ) : (
                    /* Step: Select Currency */
                    <div className="space-y-5">
                      <p className="text-gray-600">
                        This shipment was sent by <strong>{info?.senderName || 'the sender'}</strong>. Payment is required before it can be dispatched.
                      </p>
                      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <span className="text-gray-500 font-medium">Amount Due</span>
                        <span className="text-3xl font-extrabold text-secondary">${estimatedAmount} <span className="text-base font-normal text-gray-400">USD</span></span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary block">Select Cryptocurrency</label>
                        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Choose how you'd like to pay..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(c => (
                              <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleGetAddress}
                        disabled={isPaySubmitting || !selectedCurrency}
                        className="w-full h-12 text-base"
                      >
                        {isPaySubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        Get Payment Address
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Summary Card ── */}
            <Card className="overflow-hidden border-none shadow-md">
              <div className="bg-secondary text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Tracking Number</p>
                  <h2 className="text-2xl font-bold font-mono tracking-tight">{trackingInfo.trackingNumber}</h2>
                </div>
                <div className="flex gap-4">
                  <div className="bg-white/10 px-4 py-2 rounded-lg">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Status</p>
                    <StatusBadge status={trackingInfo.status as any} className="text-sm bg-white/20 text-white border-white/30" />
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-lg">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Service</p>
                    <p className="font-semibold capitalize">{trackingInfo.serviceType || 'Standard'}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                  <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-gray-200 -translate-x-1/2"></div>

                  <div className="flex items-start gap-4 relative z-10 bg-white">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border-4 border-white">
                      <MapPin className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">ORIGIN</p>
                      <p className="text-lg font-bold text-secondary mt-1">{trackingInfo.originCity}</p>
                      {trackingInfo.originState && <p className="text-gray-600">{trackingInfo.originState}</p>}
                    </div>
                  </div>

                  <div className="flex items-start gap-4 relative z-10 bg-white">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-4 border-white">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">DESTINATION</p>
                      <p className="text-lg font-bold text-secondary mt-1">{trackingInfo.destinationCity}</p>
                      {trackingInfo.destinationState && <p className="text-gray-600">{trackingInfo.destinationState}</p>}
                    </div>
                  </div>
                </div>

                {trackingInfo.estimatedDelivery && trackingInfo.status !== 'delivered' && (
                  <div className="mt-8 pt-8 border-t border-gray-100 flex items-center gap-3 justify-center text-center">
                    <Clock className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-gray-500">Estimated Delivery</p>
                      <p className="text-xl font-bold text-secondary">
                        {format(new Date(trackingInfo.estimatedDelivery), 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Timeline ── */}
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <h3 className="text-xl font-bold text-secondary mb-8">Tracking History</h3>
              <div className="relative pl-6 border-l-2 border-gray-200 space-y-8 ml-4">
                {trackingInfo.events.map((event: any, idx: number) => {
                  const isFirst = idx === 0;
                  let EventIcon = Package;
                  if (event.status === 'delivered') EventIcon = CheckCircle2;
                  else if (event.status === 'in_transit') EventIcon = Truck;

                  return (
                    <div key={event.id} className="relative">
                      <div className={`absolute -left-[35px] h-4 w-4 rounded-full border-4 border-white shadow-sm ${isFirst ? 'bg-primary' : 'bg-gray-300'}`}></div>
                      <div className={`flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 ${isFirst ? 'opacity-100' : 'opacity-70'}`}>
                        <div className="w-40 shrink-0">
                          <p className="font-semibold text-secondary">{format(new Date(event.createdAt), 'MMM d, yyyy')}</p>
                          <p className="text-sm text-gray-500">{format(new Date(event.createdAt), 'h:mm a')}</p>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-4">
                          <p className="font-semibold text-secondary flex items-center gap-2">
                            <EventIcon className={`h-4 w-4 ${isFirst ? 'text-primary' : 'text-gray-500'}`} />
                            {event.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </p>
                          <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                          {event.location && (
                            <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
