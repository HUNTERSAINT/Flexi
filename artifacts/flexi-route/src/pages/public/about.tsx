import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Users, Award, Globe, TrendingUp } from 'lucide-react';

const team = [
  {
    name: 'Marcus Williams',
    title: 'Chief Executive Officer',
    img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Sarah Chen',
    title: 'Chief Operations Officer',
    img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'David Okafor',
    title: 'VP of Logistics',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop',
  },
  {
    name: 'Elena Rodriguez',
    title: 'Head of Customer Success',
    img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&auto=format&fit=crop',
  },
];

const values = [
  { icon: ShieldCheck, title: 'Trust & Reliability', desc: 'Every shipment is handled with care and fully insured from pickup to delivery.' },
  { icon: Clock, title: 'Speed & Precision', desc: 'AI-optimized routes mean we deliver on time, every time — no guesswork.' },
  { icon: Users, title: 'Customer First', desc: 'Our 24/7 support team is always reachable when you need help most.' },
  { icon: Globe, title: 'Nationwide Reach', desc: 'We cover all 50 states with a fleet of 2,000+ vetted drivers.' },
  { icon: Award, title: 'Award-Winning Service', desc: 'Recognized by Logistics World as the #1 regional carrier three years running.' },
  { icon: TrendingUp, title: 'Always Improving', desc: 'We invest in technology and people to keep raising the bar on delivery.' },
];

export default function About() {
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
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold mb-6"
          >
            About <span className="text-primary">Flexi Route</span>
          </motion.h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Founded in 2015, Flexi Route is America's fastest-growing logistics company — built on a simple promise: your package, on time, every time.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-6">Our Mission</h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              We exist to make freight simple, affordable, and transparent for businesses of every size. While giants in the logistics industry focused on enterprise accounts, we built a platform that puts the small business owner, e-commerce seller, and growing startup on equal footing.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              Today we move over 10,000 shipments a month across 50 states, powered by cutting-edge routing algorithms and a network of trusted local drivers who know their communities.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl transform rotate-3"></div>
            <img
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop"
              alt="Logistics warehouse"
              className="rounded-3xl shadow-xl relative z-10 object-cover h-[420px] w-full"
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-4">What We Stand For</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Our values aren't just words on a wall. They're the decisions we make every single day.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-5">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-secondary mb-2">{v.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-4">Our Fleet</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">From vans to full freight trucks, we have the right vehicle for every job.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative rounded-3xl overflow-hidden h-72 group">
              <img
                src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=2075&auto=format&fit=crop"
                alt="Delivery fleet"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <div className="text-white">
                  <p className="font-bold text-xl">Delivery Fleet</p>
                  <p className="text-gray-300 text-sm">2,000+ vans and cargo vehicles</p>
                </div>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden h-72 group">
              <img
                src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2070&auto=format&fit=crop"
                alt="Freight trucks"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <div className="text-white">
                  <p className="font-bold text-xl">Freight Division</p>
                  <p className="text-gray-300 text-sm">LTL and FTL capacity nationwide</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-4">Leadership Team</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">The people driving Flexi Route forward — experienced operators who've built and scaled logistics networks across the country.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((person, i) => (
              <motion.div
                key={person.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <img
                  src={person.img}
                  alt={person.name}
                  className="w-36 h-36 rounded-full mx-auto object-cover mb-4 shadow-md border-4 border-white"
                />
                <h3 className="font-bold text-secondary text-lg">{person.name}</h3>
                <p className="text-gray-500 text-sm">{person.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
