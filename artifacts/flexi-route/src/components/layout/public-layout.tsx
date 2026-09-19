import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Package, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { user } = useAuth();
  const [location] = useLocation();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/services', label: 'Services' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/track', label: 'Track' },
    { href: '/contact', label: 'Contact' },
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
            <div className="bg-primary p-2 rounded-lg text-white">
              <Package className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-secondary tracking-tight">Flexi Route</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === link.href ? 'text-primary' : 'text-gray-600'
                }`}
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Link href={user.role === 'admin' ? '/admin' : user.role === 'driver' ? '/driver' : '/dashboard'}>
                <Button variant="outline" className="font-medium" data-testid="button-dashboard">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost" className="font-medium" data-testid="button-login">
                  Login
                </Button>
              </Link>
            )}
            <Link href="/book">
              <Button className="font-medium bg-secondary hover:bg-secondary/90 text-white" data-testid="button-book-now">
                Book Now
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 text-gray-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
            >
              <div className="px-4 py-4 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-base font-medium py-2 ${
                      location === link.href ? 'text-primary' : 'text-gray-600'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-gray-100 my-2" />
                {user ? (
                  <Link href={user.role === 'admin' ? '/admin' : user.role === 'driver' ? '/driver' : '/dashboard'} onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-center">
                      Login
                    </Button>
                  </Link>
                )}
                <Link href="/book" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full justify-center bg-secondary text-white hover:bg-secondary/90">
                    Book Now
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-secondary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold tracking-tight">Flexi Route</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Professional logistics and nationwide delivery solutions built on trust, speed, and reliability.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-lg">Services</h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><Link href="/services" className="hover:text-white transition-colors">Standard Shipping</Link></li>
                <li><Link href="/services" className="hover:text-white transition-colors">Express Delivery</Link></li>
                <li><Link href="/services" className="hover:text-white transition-colors">Overnight Priority</Link></li>
                <li><Link href="/services" className="hover:text-white transition-colors">Freight & Cargo</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-lg">Company</h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/track" className="hover:text-white transition-colors">Track Shipment</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 text-lg">Contact</h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li>1-800-FLEXI-ROUTE</li>
                <li>support@flexiroute.com</li>
                <li>123 Logistics Way<br />Chicago, IL 60601</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Flexi Route Logistics. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
