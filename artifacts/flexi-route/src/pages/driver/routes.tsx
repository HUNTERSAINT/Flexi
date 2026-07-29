import React from 'react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import DriverDashboard from '@/pages/driver/dashboard';
import Deliveries from '@/pages/driver/deliveries';
import DeliveryDetail from '@/pages/driver/delivery-detail';
import { Route, Switch } from 'wouter';

export function DriverRoutes() {
  return (
    <ProtectedRoute allowedRoles={['driver']}>
      <DashboardLayout>
        <Switch>
          <Route path="/driver" component={DriverDashboard} />
          <Route path="/driver/deliveries" component={Deliveries} />
          <Route path="/driver/delivery/:id" component={DeliveryDetail} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
