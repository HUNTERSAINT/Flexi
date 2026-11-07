import React from 'react';
import { Route, Switch, Router as WouterRouter, Redirect, useParams, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SeoManager } from '@/components/seo/seo-manager';

import { PublicLayout } from '@/components/layout/public-layout';
const Home = React.lazy(() => import('@/pages/public/home'));
const Login = React.lazy(() => import('@/pages/public/login'));
const Register = React.lazy(() => import('@/pages/public/register'));
const Track = React.lazy(() => import('@/pages/public/track'));
const Pricing = React.lazy(() => import('@/pages/public/pricing'));
const About = React.lazy(() => import('@/pages/public/about'));
const Services = React.lazy(() => import('@/pages/public/services'));
const Contact = React.lazy(() => import('@/pages/public/contact'));
const Faq = React.lazy(() => import('@/pages/public/faq'));
const BookPublic = React.lazy(() => import('@/pages/public/book-public'));
const NotFound = React.lazy(() => import('@/pages/not-found'));

const CustomerRoutes = React.lazy(() => import('@/pages/customer/routes').then((module) => ({ default: module.CustomerRoutes })));
const AdminRoutes = React.lazy(() => import('@/pages/admin/routes').then((module) => ({ default: module.AdminRoutes })));
const DriverRoutes = React.lazy(() => import('@/pages/driver/routes').then((module) => ({ default: module.DriverRoutes })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <React.Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-gray-500" role="status">Loading Flexi Route…</div>}>
    <Switch>
      {/* Auth Routes */}
      <Route path="/login">
        {user ? <Redirect to={user.role === 'admin' ? '/admin' : user.role === 'driver' ? '/driver' : '/dashboard'} /> : <Login />}
      </Route>
      <Route path="/register">
        {user ? <Redirect to="/dashboard" /> : <Register />}
      </Route>

      {/* Dashboard Routes */}
      <Route path="/dashboard/*" component={CustomerRoutes} />
      <Route path="/dashboard" component={CustomerRoutes} />
      <Route path="/admin/*" component={AdminRoutes} />
      <Route path="/admin" component={AdminRoutes} />
      <Route path="/driver/*" component={DriverRoutes} />
      <Route path="/driver" component={DriverRoutes} />

      {/* Book: logged-in users go to dashboard book, guests use public booking */}
      <Route path="/book">
        {user
          ? <Redirect to="/dashboard/book" />
          : <PublicLayout><BookPublic /></PublicLayout>
        }
      </Route>

      {/* Public Pages */}
      <Route path="/">
        <PublicLayout><Home /></PublicLayout>
      </Route>
      <Route path="/track">
        <PublicLayout><Track /></PublicLayout>
      </Route>
      <Route path="/track/:number">
        <PublicLayout><Track /></PublicLayout>
      </Route>
      <Route path="/pricing">
        <PublicLayout><Pricing /></PublicLayout>
      </Route>
      <Route path="/about">
        <PublicLayout><About /></PublicLayout>
      </Route>
      <Route path="/services">
        <PublicLayout><Services /></PublicLayout>
      </Route>
      <Route path="/contact">
        <PublicLayout><Contact /></PublicLayout>
      </Route>
      <Route path="/faq">
        <PublicLayout><Faq /></PublicLayout>
      </Route>

      {/* 404 */}
      <Route>
        <PublicLayout><NotFound /></PublicLayout>
      </Route>
    </Switch>
    </React.Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <SeoManager />
          <AppRouter />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
