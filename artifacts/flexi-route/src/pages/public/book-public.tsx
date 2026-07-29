import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useListPricing } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Package, MapPin, CheckCircle2, ChevronRight, Loader2, CreditCard, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const serviceTypes = ['standard', 'express', 'overnight', 'freight'] as const;
const currencies = ['BTC', 'ETH', 'USDT_TRC20', 'USDT_ERC20', 'USDC', 'LTC'] as const;

const bookingSchema = z.object({
  // Sender info (guest)
  guestName: z.string().min(2, 'Name required'),
  guestEmail: z.string().email('Valid email required'),
  guestPhone: z.string().min(7, 'Phone required'),
  // Package
  serviceType: z.enum(serviceTypes),
  weightKg: z.coerce.number().min(0.1, 'Weight must be > 0'),
  dimensions: z.string().optional(),
  description: z.string().optional(),
  // Route
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
  // Payment
  receiverPays: z.boolean(),
  currency: z.enum(currencies).optional(),
});

type BookingValues = z.infer<typeof bookingSchema>;

const STEPS = [
  { id: 1, title: 'Your Info', icon: User },
  { id: 2, title: 'Package', icon: Package },
  { id: 3, title: 'Route', icon: MapPin },
  { id: 4, title: 'Payment', icon: CreditCard },
  { id: 5, title: 'Review', icon: CheckCircle2 },
];

export default function BookPublic() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [finalTracking, setFinalTracking] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: pricing } = useListPricing();

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      guestName: '', guestEmail: '', guestPhone: '',
      serviceType: 'standard', weightKg: 1,
      dimensions: '', description: '',
      originAddress: '', originCity: '', originState: '', originZip: '',
      destinationAddress: '', destinationCity: '', destinationState: '', destinationZip: '',
      recipientName: '', recipientPhone: '', recipientEmail: '',
      receiverPays: undefined as unknown as boolean,
      currency: undefined,
    },
    mode: 'onChange',
  });

  const watchValues = form.watch();
  const selectedService = pricing?.find(p => p.serviceType === watchValues.serviceType);
  const estimatedPrice = selectedService
    ? (Number(selectedService.basePriceUsd) + (watchValues.weightKg * Number(selectedService.pricePerKg))).toFixed(2)
    : '0.00';

  const handleNext = async () => {
    let fields: (keyof BookingValues)[] = [];
    if (step === 1) fields = ['guestName', 'guestEmail', 'guestPhone'];
    else if (step === 2) fields = ['serviceType', 'weightKg'];
    else if (step === 3) fields = ['originAddress', 'originCity', 'originState', 'originZip', 'destinationAddress', 'destinationCity', 'destinationState', 'destinationZip'];
    else if (step === 4) {
      if (typeof watchValues.receiverPays !== 'boolean') {
        toast.error('Please choose who will pay for this shipment');
        return;
      }
      if (watchValues.receiverPays) fields = [];
      else fields = ['currency'];
    }
    const isValid = fields.length ? await form.trigger(fields) : true;
    if (isValid) setStep(s => s + 1);
  };

  const onSubmit = async (data: BookingValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/shipments/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
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
          currency: data.receiverPays ? undefined : data.currency,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Booking failed');
      }

      const result = await response.json();
      setFinalTracking(result.trackingNumber);
      // Store token if received so user can continue to payments
      if (result.token) {
        localStorage.setItem('flexi_token', result.token);
      }
      toast.success('Shipment booked successfully!');
      setStep(6);
    } catch (err: any) {
      toast.error(err.message || 'Failed to book shipment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsToShow = STEPS.slice(0, watchValues.receiverPays ? 4 : 5);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary mb-2">Book a Shipment</h1>
        <p className="text-gray-500">
          No account needed.{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>{' '}
          for a faster experience.
        </p>
      </div>

      {/* Progress Steps */}
      {step < 6 && (
        <div className="flex items-center justify-between mb-12 relative">
          <div className="absolute top-6 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
          <div
            className="absolute top-6 left-0 h-1 bg-primary -z-10 rounded-full transition-all duration-500"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          ></div>
          {STEPS.map(s => (
            <div key={s.id} className="flex flex-col items-center gap-2 bg-gray-50 px-2">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors duration-300 border-4 border-gray-50 shadow-sm
                ${step >= s.id ? 'bg-primary text-white' : 'bg-white text-gray-400 border-gray-200'}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step >= s.id ? 'text-secondary' : 'text-gray-400'}`}>{s.title}</span>
            </div>
          ))}
        </div>
      )}

      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                {/* STEP 1: Sender Info */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <h2 className="text-xl font-bold text-secondary border-b pb-4">Your Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="guestName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input className="h-12" placeholder="John Doe" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="guestPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl><Input className="h-12" placeholder="(555) 123-4567" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="guestEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input type="email" className="h-12" placeholder="you@email.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
                      Your tracking number and updates will be sent to this email address.
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Package Details */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <h2 className="text-xl font-bold text-secondary border-b pb-4">Package Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="serviceType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {pricing?.map(p => (
                                <SelectItem key={p.id} value={p.serviceType}>
                                  {p.serviceType.charAt(0).toUpperCase() + p.serviceType.slice(1)} — {p.estimatedDays}
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
                          <FormControl><Input placeholder="e.g. 20x20x20 cm" className="h-12" {...field} /></FormControl>
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

                {/* STEP 3: Route */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Origin */}
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

                      {/* Destination */}
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

                    {/* Recipient Info */}
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
                        <p className="text-gray-600 text-sm">You pay for the shipment now using cryptocurrency.</p>
                        {!watchValues.receiverPays && <div className="mt-3 text-primary font-semibold text-sm">Selected</div>}
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue('receiverPays', true)}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${watchValues.receiverPays ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="font-bold text-secondary text-lg mb-1">Receiver Pays</div>
                        <p className="text-gray-600 text-sm">The recipient pays before delivery using the tracking page.</p>
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
                              {currencies.map(c => (
                                <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-gray-500 mt-2">Total: <span className="font-bold text-secondary">${estimatedPrice}</span> (converted at payment time)</p>
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
                            <p className="text-sm text-gray-500">We'll notify the receiver with payment instructions and the tracking number.</p>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
                          The receiver will be able to pay via the public tracking page. Delivery will proceed once payment is confirmed.
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 5: Review */}
                {step === 5 && (
                  <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <h2 className="text-2xl font-bold text-secondary text-center mb-6">Review Your Shipment</h2>
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-xs mb-4">Sender</h4>
                        <p className="font-medium text-secondary">{watchValues.guestName}</p>
                        <p className="text-gray-600 text-sm">{watchValues.guestEmail}</p>
                        <p className="text-gray-600 text-sm">{watchValues.guestPhone}</p>
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-xs mb-2">Route</h4>
                          <p className="text-sm text-gray-700">{watchValues.originCity}, {watchValues.originState} → {watchValues.destinationCity}, {watchValues.destinationState}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-xs mb-4">Package</h4>
                        <ul className="space-y-1 text-sm">
                          <li className="flex justify-between"><span className="text-gray-600">Service:</span><span className="font-medium capitalize">{watchValues.serviceType}</span></li>
                          <li className="flex justify-between"><span className="text-gray-600">Weight:</span><span className="font-medium">{watchValues.weightKg} kg</span></li>
                          {watchValues.dimensions && <li className="flex justify-between"><span className="text-gray-600">Dimensions:</span><span className="font-medium">{watchValues.dimensions}</span></li>}
                        </ul>
                        <div className="mt-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment</p>
                          {watchValues.receiverPays ? (
                            <p className="text-sm font-semibold text-orange-600">Receiver Pays — {watchValues.recipientEmail}</p>
                          ) : (
                            <div>
                              <div className="text-3xl font-extrabold text-secondary">${estimatedPrice}</div>
                              <p className="text-xs text-gray-500 mt-1">via {watchValues.currency}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 6: Success */}
                {step === 6 && (
                  <motion.div key="s6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-6">
                    <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-secondary">Shipment Booked!</h2>
                    {watchValues.receiverPays ? (
                      <p className="text-gray-600 max-w-md mx-auto">The receiver at <strong>{watchValues.recipientEmail}</strong> will receive payment instructions. Delivery proceeds once payment is confirmed.</p>
                    ) : (
                      <p className="text-gray-600 max-w-md mx-auto">Please complete your crypto payment to start processing your shipment.</p>
                    )}
                    <div className="bg-gray-50 p-6 rounded-xl inline-block border border-gray-200">
                      <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-2">Tracking Number</p>
                      <p className="text-3xl font-mono font-bold text-secondary tracking-tight">{finalTracking}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                      <Button onClick={() => setLocation(`/track?number=${finalTracking}`)} size="lg" className="h-12 px-8">
                        Track Shipment
                      </Button>
                      {!watchValues.receiverPays && (
                        <Button onClick={() => { window.location.href = '/dashboard/payments'; }} variant="outline" size="lg" className="h-12 px-8">
                          Go to Payments
                        </Button>
                      )}
                      <Button onClick={() => setLocation('/register')} variant="ghost" size="lg" className="h-12 px-8 text-primary">
                        Create Account
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {step < 6 && (
                <div className="mt-12 flex justify-between pt-6 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(s => Math.max(1, s - 1))}
                    disabled={step === 1 || isSubmitting}
                    className="h-12 px-6"
                  >
                    Back
                  </Button>
                  {step < 5 ? (
                    <Button type="button" onClick={handleNext} className="h-12 px-8 bg-secondary hover:bg-secondary/90 text-white">
                      Next Step <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting} className="h-12 px-10 bg-primary hover:bg-primary/90 text-lg">
                      {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
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
