import React from 'react';
import { Route, Switch, Router as WouterRouter, Redirect, useParams, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/lib/auth';

import { PublicLayout } from '@/components/layout/public-layout';
import Home from '@/pages/public/home';
import Login from '@/pages/public/login';
import Register from '@/pages/public/register';
import Track from '@/pages/public/track';
import Pricing from '@/pages/public/pricing';
import About from '@/pages/public/about';
import Services from '@/pages/public/services';
import Contact from '@/pages/public/contact';
import Faq from '@/pages/public/faq';
import BookPublic from '@/pages/public/book-public';
import NotFound from '@/pages/not-found';

import { CustomerRoutes } from '@/pages/customer/routes';
import { AdminRoutes } from '@/pages/admin/routes';
import { DriverRoutes } from '@/pages/driver/routes';

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
        {(params) => <Redirect to={`/track?number=${params.number}`} />}
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
