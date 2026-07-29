import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Package, Clock, ShieldCheck, ArrowRight, Star, CreditCard, Truck } from 'lucide-react';

export default function Home() {
  const [, setLocation] = useLocation();
  const [trackingNumber, setTrackingNumber] = useState('');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      setLocation(`/track?number=${encodeURIComponent(trackingNumber.trim())}`);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative bg-secondary text-white pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-secondary to-secondary/80"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight"
          >
            Ship Smarter. <br className="hidden md:block"/> Deliver <span className="text-primary">Faster.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10"
          >
            Nationwide logistics built on speed, precision, and trust. Track your freight in real-time and let us handle the complex routes.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-xl shadow-black/20 flex flex-col sm:flex-row gap-2"
          >
            <form onSubmit={handleTrack} className="flex-1 flex items-center">
              <Search className="h-5 w-5 text-gray-400 ml-4 hidden sm:block" />
              <Input 
                type="text" 
                placeholder="Enter tracking number (e.g. FR-123456789)" 
                className="border-0 shadow-none focus-visible:ring-0 text-lg h-14 text-gray-900 placeholder:text-gray-400"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                data-testid="input-hero-tracking"
              />
            </form>
            <Button 
              type="submit" 
              className="h-14 px-8 text-lg rounded-xl shrink-0"
              data-testid="button-hero-track"
            >
              Track Now
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-primary py-8 text-white relative z-20 -mt-8 mx-4 sm:mx-8 lg:mx-auto max-w-6xl rounded-2xl shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/20">
          <div className="text-center px-4">
            <div className="text-3xl md:text-4xl font-bold mb-1">10,000+</div>
            <div className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">Deliveries</div>
          </div>
          <div className="text-center px-4">
            <div className="text-3xl md:text-4xl font-bold mb-1">50</div>
            <div className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">States Covered</div>
          </div>
          <div className="text-center px-4">
            <div className="text-3xl md:text-4xl font-bold mb-1">99.8%</div>
            <div className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">On-Time Rate</div>
          </div>
          <div className="text-center px-4">
            <div className="text-3xl md:text-4xl font-bold mb-1">24/7</div>
            <div className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">Support</div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-4">Logistics Solutions for Every Need</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">From urgent parcels to full truckloads, we have the network and expertise to move your business forward.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Standard', desc: 'Reliable ground shipping at the most cost-effective rates.', icon: Truck, delay: 0 },
              { title: 'Express', desc: 'Accelerated delivery for time-sensitive packages.', icon: Clock, delay: 0.1 },
              { title: 'Overnight', desc: 'Next-morning delivery guarantee across all major cities.', icon: Package, delay: 0.2 },
              { title: 'Freight', desc: 'LTL and FTL capacity for your largest industrial shipments.', icon: MapPin, delay: 0.3 }
            ].map((service, i) => (
              <motion.div 
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: service.delay, duration: 0.5 }}
                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
              >
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-6">{service.desc}</p>
                <Button variant="link" className="px-0 text-primary hover:text-primary/80 font-semibold" onClick={() => setLocation('/services')}>
                  Learn more <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-6">Why Fortune 500s Trust Flexi Route</h2>
            <div className="space-y-8 mt-10">
              <div className="flex gap-4">
                <div className="shrink-0 mt-1"><ShieldCheck className="h-8 w-8 text-primary" /></div>
                <div>
                  <h4 className="text-xl font-bold text-secondary mb-2">Unmatched Security</h4>
                  <p className="text-gray-600">Every shipment is fully insured and monitored 24/7 with GPS tracking from origin to destination.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 mt-1"><Clock className="h-8 w-8 text-primary" /></div>
                <div>
                  <h4 className="text-xl font-bold text-secondary mb-2">Predictable Precision</h4>
                  <p className="text-gray-600">We don't give delivery windows—we give delivery times. Our AI-driven routing avoids delays before they happen.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 mt-1"><CreditCard className="h-8 w-8 text-primary" /></div>
                <div>
                  <h4 className="text-xl font-bold text-secondary mb-2">Flexible Payments</h4>
                  <p className="text-gray-600">Pay via invoice, credit card, or major cryptocurrencies via our secure integrated payment gateway.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl transform rotate-3"></div>
            <img 
              src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=2075&auto=format&fit=crop" 
              alt="Logistics fleet" 
              className="rounded-3xl shadow-xl relative z-10 object-cover h-[500px] w-full"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-secondary text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-6">Ready to move your business?</h2>
          <p className="text-xl text-gray-400 mb-10">Join thousands of businesses that rely on Flexi Route for their daily logistics.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 px-8 text-lg" onClick={() => setLocation('/book')}>
              Book a Shipment
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white" onClick={() => setLocation('/pricing')}>
              View Pricing
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
