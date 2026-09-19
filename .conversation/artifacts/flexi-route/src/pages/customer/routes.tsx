import React from 'react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import CustomerDashboard from '@/pages/customer/dashboard';
import BookShipment from '@/pages/customer/book';
import TrackShipmentDetail from '@/pages/customer/tracking-detail';
import MyShipments from '@/pages/customer/shipments';
import Payments from '@/pages/customer/payments';
import Notifications from '@/pages/customer/notifications';
import { Route, Switch } from 'wouter';

export function CustomerRoutes() {
  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <DashboardLayout>
        <Switch>
          <Route path="/dashboard" component={CustomerDashboard} />
          <Route path="/dashboard/book" component={BookShipment} />
          <Route path="/dashboard/shipments" component={MyShipments} />
          <Route path="/dashboard/tracking/:trackingNumber" component={TrackShipmentDetail} />
          <Route path="/dashboard/payments" component={Payments} />
          <Route path="/dashboard/notifications" component={Notifications} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
