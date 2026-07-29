import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { 
  LayoutDashboard, 
  PackageSearch, 
  CreditCard, 
  Bell, 
  User, 
  LogOut, 
  Menu, 
  X,
  PackagePlus,
  Users,
  Truck,
  DollarSign,
  Settings,
  Shield,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useListNotifications } from '@workspace/api-client-react';

const CUSTOMER_NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/book', label: 'Book Shipment', icon: PackagePlus },
  { href: '/dashboard/shipments', label: 'My Shipments', icon: PackageSearch },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Analytics', icon: LayoutDashboard },
  { href: '/admin/shipments', label: 'Shipments', icon: PackageSearch },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/drivers', label: 'Drivers', icon: Truck },
  { href: '/admin/payments', label: 'Payments', icon: DollarSign },
  { href: '/admin/pricing', label: 'Pricing', icon: Settings },
  { href: '/admin/wallets', label: 'Wallets', icon: Wallet },
  { href: '/admin/admins', label: 'Admins', icon: Shield },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
];

const DRIVER_NAV = [
  { href: '/driver', label: 'Overview', icon: LayoutDashboard },
  { href: '/driver/deliveries', label: 'My Deliveries', icon: Truck },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const { data: notifications } = useListNotifications(
    { isRead: false },
    { query: { enabled: !!user, refetchInterval: 30000 } }
  );

  const unreadCount = notifications?.data?.length || 0;

  const getNavLinks = () => {
    if (!user) return [];
    switch (user.role) {
      case 'admin': return ADMIN_NAV;
      case 'driver': return DRIVER_NAV;
      default: return CUSTOMER_NAV;
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar text-sidebar-foreground 
        flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <div className="bg-primary p-1.5 rounded-md text-white">
              <PackagePlus className="h-5 w-5" />
            </div>
            Flexi Route
          </Link>
          <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center text-primary font-semibold text-lg uppercase border border-sidebar-border">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-sm text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/50 capitalize truncate">{user?.role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location === link.href || (location.startsWith(link.href) && link.href !== '/dashboard' && link.href !== '/admin' && link.href !== '/driver');
            return (
              <Link 
                key={link.href}
                href={link.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-sidebar-accent text-white border border-sidebar-border' 
                    : 'text-white/70 hover:text-white hover:bg-sidebar-accent/50'
                  }
                `}
                onClick={() => setIsSidebarOpen(false)}
              >
                <link.icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-white/50'}`} />
                <span className="flex-1">{link.label}</span>
                {link.icon === Bell && unreadCount > 0 && (
                  <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white/70 hover:text-white hover:bg-sidebar-accent/50"
            onClick={logout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white h-16 border-b flex items-center px-4 justify-between sticky top-0 z-30">
          <Link href="/" className="font-bold text-lg text-secondary flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-md text-white">
              <PackagePlus className="h-4 w-4" />
            </div>
            Flexi Route
          </Link>
          <button 
            className="p-2 -mr-2 text-gray-600"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
