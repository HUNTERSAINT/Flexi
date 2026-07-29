import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Clock, Package, Truck, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';

const services = [
  {
    icon: Truck,
    title: 'Standard Shipping',
    subtitle: '3–7 Business Days',
    desc: 'Reliable, cost-effective ground delivery for everyday shipments. Perfect for non-urgent parcels and bulk orders where price matters most.',
    price: 'From $9.99',
    features: ['Door-to-door pickup', 'Real-time tracking', 'Up to 70 lbs', 'Nationwide coverage', 'Signature on delivery'],
    img: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?q=80&w=2065&auto=format&fit=crop',
    color: 'from-blue-500 to-blue-700',
  },
  {
    icon: Clock,
    title: 'Express Delivery',
    subtitle: '1–2 Business Days',
    desc: 'Accelerated shipping for time-sensitive packages. Our express network prioritizes your freight at every step of the journey.',
    price: 'From $24.99',
    features: ['Priority handling', 'Guaranteed delivery window', 'Up to 150 lbs', 'Email & SMS alerts', 'Full insurance included'],
    img: 'https://images.unsplash.com/photo-1609429019995-8c40f49535a5?q=80&w=2070&auto=format&fit=crop',
    color: 'from-primary to-orange-600',
  },
  {
    icon: Package,
    title: 'Overnight Priority',
    subtitle: 'Next Business Morning',
    desc: 'When it absolutely must arrive tomorrow. Guaranteed morning delivery to all major cities, with real-time driver tracking.',
    price: 'From $49.99',
    features: ['Next-morning delivery', 'Dedicated driver', 'Up to 70 lbs', 'Live GPS tracking', 'Proof of delivery photo'],
    img: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?q=80&w=2076&auto=format&fit=crop',
    color: 'from-purple-500 to-purple-700',
  },
  {
    icon: MapPin,
    title: 'Freight & Cargo',
    subtitle: 'LTL & FTL Options',
    desc: 'Industrial-scale shipping for pallets, machinery, and oversized items. Both Less-than-Truckload and Full Truckload options available.',
    price: 'Custom quote',
    features: ['No weight limit', 'Pallet & crate handling', 'Liftgate service', 'White-glove available', 'Dedicated freight manager'],
    img: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5716d?q=80&w=2070&auto=format&fit=crop',
    color: 'from-green-500 to-green-700',
  },
];

export default function Services() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col w-full">
      {/* Hero */}
      <section className="relative bg-secondary text-white py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2070&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/90 to-secondary"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-extrabold mb-6">
            Shipping <span className="text-primary">Services</span>
          </motion.h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            From next-day parcels to full freight loads — we have a service built for every shipment and every budget.
          </p>
        </div>
      </section>

      {/* Services Detail */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {services.map((svc, i) => (
            <motion.div
              key={svc.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
            >
              <div className={`relative rounded-3xl overflow-hidden h-80 ${i % 2 === 1 ? 'lg:order-2' : ''}`}>
                <img src={svc.img} alt={svc.title} className="w-full h-full object-cover" />
                <div className={`absolute inset-0 bg-gradient-to-br ${svc.color} opacity-30`}></div>
                <div className="absolute top-6 left-6 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-xl border border-white/20">
                  <p className="font-bold text-sm">{svc.price}</p>
                </div>
              </div>

              <div className={i % 2 === 1 ? 'lg:order-1' : ''}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <svc.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-secondary">{svc.title}</h2>
                    <p className="text-primary font-semibold text-sm">{svc.subtitle}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">{svc.desc}</p>
                <ul className="space-y-2 mb-8">
                  {svc.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={() => setLocation('/book')} className="gap-2">
                  Book {svc.title} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-secondary text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-4">Not sure which service you need?</h2>
          <p className="text-gray-400 text-lg mb-8">Our team will recommend the right option based on your shipment details and budget.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 px-8 text-lg" onClick={() => setLocation('/book')}>Get a Quote</Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white" onClick={() => setLocation('/contact')}>Talk to Sales</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
