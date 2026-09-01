import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useCreateShipment, useCreatePayment, useListPricing, ShipmentInputServiceType, PaymentInputCurrency } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Package, MapPin, Truck, CheckCircle2, ChevronRight, Loader2, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const serviceOptions = [
  { value: 'standard', label: 'Standard', estimatedDays: '5–7 business days' },
  { value: 'express', label: 'Express', estimatedDays: '2–3 business days' },
  { value: 'overnight', label: 'Overnight', estimatedDays: 'Next business day' },
  { value: 'freight', label: 'Freight', estimatedDays: '7–14 business days' },
] as const;

const bookingSchema = z.object({
  serviceType: z.nativeEnum(ShipmentInputServiceType),
  weightKg: z.coerce.number().min(0.1, 'Weight must be > 0'),
  dimensions: z.string().optional(),
  description: z.string().optional(),
  originAddress: z.string().min(5, 'Address required'),
  originCity: z.string().min(2, 'City required'),
  originState: z.string().min(2, 'State required'),
  originZip: z.string().min(5, 'ZIP required'),
  destinationAddress: z.string().min(5, 'Address required'),
  destinationCity: z.string().min(2, 'City required'),
  destinationState: z.string().min(2, 'State required'),
  destinationZip: z.string().min(5, 'ZIP required'),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email('Valid email required').optional().or(z.literal('')),
  receiverPays: z.boolean(),
  currency: z.nativeEnum(PaymentInputCurrency).optional(),
});

type BookingValues = z.infer<typeof bookingSchema>;

const STEPS = [
  { id: 1, title: 'Package', icon: Package },
  { id: 2, title: 'Route', icon: MapPin },
  { id: 3, title: 'Review', icon: CheckCircle2 },
  { id: 4, title: 'Payment', icon: CreditCard },
];

export default function BookShipment() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [finalTracking, setFinalTracking] = useState('');
  const { data: pricing } = useListPricing();
  const availableServices = pricing?.length
    ? pricing.map((item) => ({
        value: item.serviceType,
        label: item.serviceLabel || item.serviceType,
        estimatedDays: item.estimatedDays || 'Delivery estimate unavailable',
      }))
    : serviceOptions;

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceType: ShipmentInputServiceType.standard,
      weightKg: 1,
      dimensions: '', description: '',
      originAddress: '', originCity: '', originState: '', originZip: '',
      destinationAddress: '', destinationCity: '', destinationState: '', destinationZip: '',
      recipientName: '', recipientPhone: '', recipientEmail: '',
      receiverPays: undefined as unknown as boolean,
      currency: undefined,
    },
    mode: 'onChange',
  });

  const createShipment = useCreateShipment();
  const createPayment = useCreatePayment();

  const watchValues = form.watch();
  const selectedService = pricing?.find(p => p.serviceType === watchValues.serviceType);
  const estimatedPrice = selectedService
    ? (Number(selectedService.basePriceUsd) + (watchValues.weightKg * Number(selectedService.pricePerKg))).toFixed(2)
    : '0.00';

  const handleNext = async () => {
    let isValid = false;
    if (step === 1) isValid = await form.trigger(['serviceType', 'weightKg']);
    else if (step === 2) isValid = await form.trigger(['originAddress', 'originCity', 'originState', 'originZip', 'destinationAddress', 'destinationCity', 'destinationState', 'destinationZip']);
    else isValid = true;
    if (isValid) setStep(s => s + 1);
  };

  const onSubmit = async (data: BookingValues) => {
    if (typeof data.receiverPays !== 'boolean') {
      toast.error('Please choose who will pay for this shipment');
      return;
    }
    if (data.receiverPays === false && !data.currency) {
      toast.error('Please select a cryptocurrency for payment');
      return;
    }
    try {
      const shipmentPayload: any = {
        serviceType: data.serviceType,
        weightKg: data.weightKg,
        dimensions: data.dimensions || undefined,
        description: data.description || undefined,
        originAddress: data.originAddress,
        originCity: data.originCity,
        originState: data.originState,
        originZip: data.originZip,
        destinationAddress: data.destinationAddress,
        destinationCity: data.destinationCity,
        destinationState: data.destinationState,
        destinationZip: data.destinationZip,
        recipientName: data.recipientName || undefined,
        recipientPhone: data.recipientPhone || undefined,
        recipientEmail: data.recipientEmail || undefined,
        receiverPays: data.receiverPays,
      };

      const shipment = await createShipment.mutateAsync({ data: shipmentPayload });

      if (!data.receiverPays) {
        const amount = Number(shipment.totalAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error('Shipment pricing is unavailable. Please refresh and try again.');
        }
        await createPayment.mutateAsync({
          data: { shipmentId: shipment.id, amount, currency: data.currency! }
        });
      }

      toast.success('Shipment booked successfully!');
      setFinalTracking(shipment.trackingNumber);
      setStep(5);
    } catch (err: any) {
      toast.error(err?.data?.error || 'Failed to book shipment.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary mb-2">Book a Shipment</h1>
        <p className="text-gray-500">Fill out the details below to schedule your delivery.</p>
      </div>

      {/* Progress Steps */}
      {step < 5 && (
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded-full"></div>
          <div
            className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          ></div>
          {STEPS.map(s => (
            <div key={s.id} className="flex flex-col items-center gap-2 bg-gray-50 px-2">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors duration-300 border-4 border-gray-50 shadow-sm
                ${step >= s.id ? 'bg-primary text-white' : 'bg-white text-gray-400 border-gray-200'}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className={`text-sm font-medium ${step >= s.id ? 'text-secondary' : 'text-gray-400'}`}>{s.title}</span>
            </div>
          ))}
        </div>
      )}

      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                {/* STEP 1 */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <h2 className="text-xl font-bold text-secondary border-b pb-4">Package Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="serviceType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-12"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {availableServices.map(p => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label} — {p.estimatedDays}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="weightKg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg)</FormLabel>
                          <FormControl><Input type="number" step="0.1" className="h-12" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="dimensions" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions (optional)</FormLabel>
                          <FormControl><Input placeholder="20x20x20 cm" className="h-12" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contents (optional)</FormLabel>
                          <FormControl><Input placeholder="Electronics, clothing..." className="h-12" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </motion.div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h2 className="text-xl font-bold text-secondary border-b pb-3 flex items-center gap-2"><MapPin className="h-5 w-5 text-gray-400" />Origin</h2>
                        <FormField control={form.control} name="originAddress" render={({ field }) => (
                          <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="originCity" render={({ field }) => (
                            <FormItem className="col-span-2"><FormLabel>City</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="originState" render={({ field }) => (
                            <FormItem><FormLabel>State</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="originZip" render={({ field }) => (
                            <FormItem><FormLabel>ZIP</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h2 className="text-xl font-bold text-secondary border-b pb-3 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Destination</h2>
                        <FormField control={form.control} name="destinationAddress" render={({ field }) => (
                          <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="destinationCity" render={({ field }) => (
                            <FormItem className="col-span-2"><FormLabel>City</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="destinationState" render={({ field }) => (
                            <FormItem><FormLabel>State</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="destinationZip" render={({ field }) => (
                            <FormItem><FormLabel>ZIP</FormLabel><FormControl><Input className="h-12" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-secondary mb-4">Recipient Details (optional)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="recipientName" render={({ field }) => (
                          <FormItem><FormLabel>Recipient Name</FormLabel><FormControl><Input className="h-12" placeholder="Jane Smith" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="recipientPhone" render={({ field }) => (
                          <FormItem><FormLabel>Recipient Phone</FormLabel><FormControl><Input className="h-12" placeholder="(555) 987-6543" {...field} /></FormControl></FormItem>
                        )} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Review */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <h2 className="text-2xl font-bold text-secondary text-center mb-6">Review Your Shipment</h2>
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-xs mb-4">Route</h4>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-secondary">Origin</p>
                              <p className="text-gray-600 text-sm">{watchValues.originAddress}<br />{watchValues.originCity}, {watchValues.originState} {watchValues.originZip}</p>
                            </div>
                          </div>
                          <div className="h-6 border-l-2 border-dashed border-gray-300 ml-2.5"></div>
                          <div className="flex gap-3">
                            <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-secondary">Destination</p>
                              <p className="text-gray-600 text-sm">{watchValues.destinationAddress}<br />{watchValues.destinationCity}, {watchValues.destinationState} {watchValues.destinationZip}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-xs mb-4">Package</h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex justify-between"><span className="text-gray-600">Service:</span><span className="font-medium capitalize">{watchValues.serviceType}</span></li>
                          <li className="flex justify-between"><span className="text-gray-600">Weight:</span><span className="font-medium">{watchValues.weightKg} kg</span></li>
                          {watchValues.dimensions && <li className="flex justify-between"><span className="text-gray-600">Dimensions:</span><span className="font-medium">{watchValues.dimensions}</span></li>}
                        </ul>
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                          <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-xs mb-2">Estimated Cost</h4>
                          <div className="text-3xl font-extrabold text-secondary">${estimatedPrice}</div>
                          <p className="text-xs text-gray-500 mt-1">Select payment method on next step.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Payment */}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <h2 className="text-xl font-bold text-secondary border-b pb-4">Who Pays?</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => form.setValue('receiverPays', false)}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${!watchValues.receiverPays ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="font-bold text-secondary text-lg mb-1">Sender Pays</div>
                        <p className="text-gray-600 text-sm">You pay now using cryptocurrency.</p>
                        {!watchValues.receiverPays && <div className="mt-3 text-primary font-semibold text-sm">Selected</div>}
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue('receiverPays', true)}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${watchValues.receiverPays ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="font-bold text-secondary text-lg mb-1">Receiver Pays</div>
                        <p className="text-gray-600 text-sm">The recipient pays before delivery.</p>
                        {watchValues.receiverPays && <div className="mt-3 text-primary font-semibold text-sm">Selected</div>}
                      </button>
                    </div>

                    {watchValues.receiverPays === false && (
                      <FormField control={form.control} name="currency" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Cryptocurrency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 text-lg"><SelectValue placeholder="Select currency" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(PaymentInputCurrency).map(c => (
                                <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-gray-500 mt-2">Total: <span className="font-bold text-secondary">${estimatedPrice}</span></p>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}

                    {watchValues.receiverPays === true && (
                      <div className="space-y-4">
                        <FormField control={form.control} name="recipientEmail" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Email</FormLabel>
                            <FormControl><Input type="email" className="h-12" placeholder="recipient@email.com" {...field} /></FormControl>
                            <p className="text-sm text-gray-500">The receiver will get payment instructions via email.</p>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
                          Delivery proceeds once the receiver completes payment on the tracking page.
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 5: Success */}
                {step === 5 && (
                  <motion.div key="s5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-6">
                    <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-secondary">Shipment Booked!</h2>
                    {watchValues.receiverPays ? (
                      <p className="text-gray-600 max-w-md mx-auto">The receiver will receive payment instructions. Delivery proceeds once payment is confirmed.</p>
                    ) : (
                      <p className="text-gray-600 max-w-md mx-auto">Please complete your payment to start processing your shipment.</p>
                    )}
                    <div className="bg-gray-50 p-6 rounded-xl inline-block border border-gray-200">
                      <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-2">Tracking Number</p>
                      <p className="text-3xl font-mono font-bold text-secondary">{finalTracking}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                      {!watchValues.receiverPays && (
                        <Button onClick={() => setLocation('/dashboard/payments')} size="lg" className="h-12 px-8 text-lg">Go to Payments</Button>
                      )}
                      <Button onClick={() => setLocation(`/dashboard/tracking/${finalTracking}`)} variant="outline" size="lg" className="h-12 px-8 text-lg">Track Shipment</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {step < 5 && (
                <div className="mt-12 flex justify-between pt-6 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))}
                    disabled={step === 1 || createShipment.isPending || createPayment.isPending} className="h-12 px-6">
                    Back
                  </Button>
                  {step < 4 ? (
                    <Button type="button" onClick={handleNext} className="h-12 px-8 bg-secondary hover:bg-secondary/90 text-white">
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={createShipment.isPending || createPayment.isPending} className="h-12 px-10 bg-primary hover:bg-primary/90 text-lg">
                      {(createShipment.isPending || createPayment.isPending) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      Confirm &amp; Book
                    </Button>
                  )}
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
