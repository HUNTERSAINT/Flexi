import React from 'react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import AdminDashboard from '@/pages/admin/dashboard';
import Shipments from '@/pages/admin/shipments';
import Customers from '@/pages/admin/customers';
import Drivers from '@/pages/admin/drivers';
import Payments from '@/pages/admin/payments';
import Pricing from '@/pages/admin/pricing';
import Wallets from '@/pages/admin/wallets';
import Notifications from '@/pages/admin/notifications';
import AdminsPage from '@/pages/admin/admins';
import { Route, Switch } from 'wouter';

export function AdminRoutes() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/shipments" component={Shipments} />
          <Route path="/admin/customers" component={Customers} />
          <Route path="/admin/drivers" component={Drivers} />
          <Route path="/admin/payments" component={Payments} />
          <Route path="/admin/pricing" component={Pricing} />
          <Route path="/admin/wallets" component={Wallets} />
          <Route path="/admin/admins" component={AdminsPage} />
          <Route path="/admin/notifications" component={Notifications} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
