import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Package, CreditCard, MapPin, Clock, Shield, Truck } from 'lucide-react';

const categories = [
  {
    icon: Package,
    label: 'Shipping',
    faqs: [
      { q: 'What items can I ship with Flexi Route?', a: 'We accept most non-hazardous goods, including electronics, clothing, documents, and household items. Prohibited items include flammable goods, live animals, and perishables. Contact us for unusual items.' },
      { q: 'What is the maximum weight for a shipment?', a: 'Standard and Express services support up to 150 lbs. Overnight Priority supports up to 70 lbs. Freight & Cargo has no weight limit — we handle full pallets and industrial equipment.' },
      { q: 'Can I schedule a pickup?', a: 'Yes. After booking online you can schedule a same-day or next-day pickup window. Our driver will arrive within your selected 2-hour window.' },
      { q: 'Do you offer packaging materials?', a: 'Drivers carry basic packing tape and padding on request. For specialized packaging such as fragile electronics or art, we recommend arriving pre-packed.' },
    ],
  },
  {
    icon: CreditCard,
    label: 'Payments',
    faqs: [
      { q: 'What cryptocurrencies do you accept?', a: 'We accept Bitcoin (BTC), Ethereum (ETH), USDT (TRC20 & ERC20), USDC, and Litecoin (LTC). Wallet addresses are provided at checkout.' },
      { q: 'Can the receiver pay instead of the sender?', a: 'Yes! When booking you can select "Receiver Pays" and enter the recipient\'s email. The receiver will be given the tracking number and payment instructions.' },
      { q: 'How long does payment confirmation take?', a: 'Crypto payments are confirmed after 1–3 blockchain confirmations, typically within 15–60 minutes. Our team reviews and confirms your payment, then your shipment moves to processing.' },
      { q: 'What happens if my payment is rejected?', a: 'If your payment cannot be verified, our team will contact you with details. You can resubmit a TXID or a payment screenshot. Common reasons include incorrect amounts or unconfirmed transactions.' },
    ],
  },
  {
    icon: MapPin,
    label: 'Tracking',
    faqs: [
      { q: 'How do I track my shipment?', a: 'Visit our Track page and enter your tracking number. No account needed — just the number from your booking confirmation. You\'ll see the full event history in real time.' },
      { q: 'When will my tracking number be activated?', a: 'Your tracking number is generated immediately after booking. It becomes active with live updates once payment is confirmed and the shipment is picked up.' },
      { q: 'Can I track without creating an account?', a: 'Absolutely. The public tracking page works for everyone — just enter the tracking number. No login required.' },
    ],
  },
  {
    icon: Shield,
    label: 'Insurance & Claims',
    faqs: [
      { q: 'Are shipments insured?', a: 'All shipments include basic coverage up to $100 at no extra charge. Additional insurance up to $5,000 is available for a small premium at checkout.' },
      { q: 'What if my package is lost or damaged?', a: 'Contact our support team within 7 days of the expected delivery date. We\'ll initiate a claim and resolve it within 5–10 business days.' },
    ],
  },
  {
    icon: Clock,
    label: 'Delivery',
    faqs: [
      { q: 'What if delivery is late?', a: 'Express and Overnight services come with a delivery guarantee. If we miss the window, you\'ll receive a credit toward your next shipment. Standard shipping estimates are not guaranteed.' },
      { q: 'Can I change the delivery address after booking?', a: 'Yes, within 2 hours of booking or before the shipment is picked up. Contact support immediately as changes after pickup may incur a rerouting fee.' },
      { q: 'What if no one is home during delivery?', a: 'Our driver will leave a delivery notice and attempt two more deliveries. You can also request a hold at our nearest facility for self-pickup.' },
    ],
  },
  {
    icon: Truck,
    label: 'Account & Booking',
    faqs: [
      { q: 'Do I need an account to book a shipment?', a: 'No! You can book as a guest by providing your name and email. You\'ll receive a tracking number immediately. Creating an account lets you manage multiple shipments and view payment history.' },
      { q: 'How do I create a driver account?', a: 'Driver accounts are created by our operations team. If you\'re interested in joining our driver network, use the Contact page to get in touch.' },
      { q: 'Can I cancel a shipment?', a: 'Cancellations are free if made before pickup. After pickup, a 10% handling fee applies. Once the shipment is in transit, cancellation is not possible.' },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-secondary pr-4">{q}</span>
        <ChevronDown className={`h-5 w-5 text-primary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Faq() {
  const [activeCategory, setActiveCategory] = useState('Shipping');

  const current = categories.find(c => c.label === activeCategory)!;

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
            Frequently Asked <span className="text-primary">Questions</span>
          </motion.h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">Find answers to the most common questions about shipping, payments, and tracking.</p>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {categories.map(cat => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === cat.label
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary/50 hover:text-primary'
                }`}
              >
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ list */}
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {current.faqs.map(faq => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </motion.div>

          {/* Still need help */}
          <div className="mt-16 bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-secondary mb-3">Still have questions?</h3>
            <p className="text-gray-600 mb-6">Our support team is available 24/7 and typically responds within 2 hours.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="mailto:support@flexiroute.com" className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors">Email Support</a>
              <a href="tel:18003539476" className="inline-flex items-center justify-center gap-2 bg-secondary text-white font-semibold px-6 py-3 rounded-xl hover:bg-secondary/90 transition-colors">Call 1-800-FLEXI-ROUTE</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
