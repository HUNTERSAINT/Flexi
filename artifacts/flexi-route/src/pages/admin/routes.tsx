import React from 'react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import AdminDashboard from '@/pages/admin/dashboard';
import Shipments from '@/pages/admin/shipments';
import Customers from '@/pages/admin/customers';
import Drivers from '@/pages/admin/drivers';
import Payments from '@/pages/admin/payments';
import Pricing from '@/pages/admin/pricing';
import Notifications from '@/pages/admin/notifications';
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
          <Route path="/admin/notifications" component={Notifications} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
