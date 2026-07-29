import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const offices = [
  { city: 'Chicago (HQ)', address: '123 Logistics Way, Chicago, IL 60601', phone: '+1 (800) 353-9476', img: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2244&auto=format&fit=crop' },
  { city: 'Los Angeles', address: '456 Freight Blvd, Los Angeles, CA 90012', phone: '+1 (800) 353-9477', img: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?q=80&w=2070&auto=format&fit=crop' },
  { city: 'New York', address: '789 Shipping Ave, New York, NY 10001', phone: '+1 (800) 353-9478', img: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?q=80&w=2070&auto=format&fit=crop' },
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitted(true);
    toast.success('Message sent! We\'ll get back to you within 24 hours.');
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hero */}
      <section className="relative bg-secondary text-white py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src="https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2070&auto=format&fit=crop" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/90 to-secondary"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-extrabold mb-6">
            Contact <span className="text-primary">Us</span>
          </motion.h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">Have a question or need a custom quote? Our team is ready to help — 24 hours a day, 7 days a week.</p>
        </div>
      </section>

      {/* Quick Contact Info */}
      <section className="py-16 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Phone, title: 'Call Us', detail: '1-800-FLEXI-ROUTE', sub: 'Available 24/7' },
              { icon: Mail, title: 'Email Us', detail: 'support@flexiroute.com', sub: 'Response within 2 hours' },
              { icon: Clock, title: 'Business Hours', detail: 'Mon–Fri: 7am–10pm CST', sub: 'Weekend: 8am–6pm CST' },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-4 p-6 bg-gray-50 rounded-2xl">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-secondary text-lg">{item.title}</h3>
                  <p className="text-gray-800 font-medium mt-1">{item.detail}</p>
                  <p className="text-gray-500 text-sm">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form + Map */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Form */}
          <div>
            <h2 className="text-3xl font-bold text-secondary mb-2">Send a Message</h2>
            <p className="text-gray-600 mb-8">Fill out the form and our team will reach out within 24 hours.</p>

            {submitted ? (
              <div className="text-center py-16">
                <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-bold text-secondary mb-2">Message Sent!</h3>
                <p className="text-gray-600">Thanks for reaching out. We'll be in touch shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name *</label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="h-12" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Email Address *</label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@company.com" className="h-12" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="How can we help?" className="h-12" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Message *</label>
                  <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us about your shipping needs..." rows={6} />
                </div>
                <Button type="submit" size="lg" className="w-full h-12 text-lg">Send Message</Button>
              </form>
            )}
          </div>

          {/* Offices */}
          <div>
            <h2 className="text-3xl font-bold text-secondary mb-2">Our Offices</h2>
            <p className="text-gray-600 mb-8">Visit us at any of our locations across the country.</p>
            <div className="space-y-4">
              {offices.map(office => (
                <div key={office.city} className="flex items-start gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0">
                    <img src={office.img} alt={office.city} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-secondary">{office.city}</h3>
                    <p className="text-gray-600 text-sm mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{office.address}</p>
                    <p className="text-gray-600 text-sm mt-0.5 flex items-center gap-1"><Phone className="h-3 w-3" />{office.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
