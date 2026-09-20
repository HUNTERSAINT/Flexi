import React from 'react';
import { useGetMyDeliveries } from '@workspace/api-client-react';
import { StatCard } from '@/components/ui/stat-card';
import { Package, Truck, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function DriverDashboard() {
  const { data: deliveriesResponse, isLoading } = useGetMyDeliveries();

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const deliveries = deliveriesResponse || [];
  
  const todayDeliveries = deliveries.filter(d => ['processing', 'in_transit', 'out_for_delivery'].includes(d.status));
  const completedToday = deliveries.filter(d => d.status === 'delivered').length; // Simplification

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-secondary tracking-tight">Driver Hub</h1>
        <p className="text-gray-500 mt-1">Manage your active route and deliveries.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Active Deliveries" value={todayDeliveries.length} icon={Truck} className="border-blue-100 bg-blue-50/30" />
        <StatCard title="Completed Today" value={completedToday} icon={CheckCircle2} className="border-green-100 bg-green-50/30" />
        <StatCard title="Total Assigned" value={deliveries.length} icon={Package} />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-secondary mb-4 flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" /> Active Route
        </h2>
        
        {todayDeliveries.length === 0 ? (
          <Card className="border-dashed shadow-none bg-gray-50/50">
            <CardContent className="p-12 text-center">
              <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary">No active deliveries</h3>
              <p className="text-gray-500">You don't have any pending deliveries assigned right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {todayDeliveries.map(delivery => (
              <Card key={delivery.id} className="shadow-sm hover:shadow-md transition-shadow border-gray-200">
                <CardContent className="p-0">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg text-secondary">{delivery.trackingNumber}</span>
                        <StatusBadge status={delivery.status as any} />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex gap-3">
                          <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Pickup</p>
                            <p className="text-sm font-medium">{delivery.originAddress}</p>
                            <p className="text-xs text-gray-500">{delivery.originCity}, {delivery.originState} {delivery.originZip}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <MapPin className="h-5 w-5 text-primary shrink-0" />
                          <div>
                            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-0.5">Dropoff</p>
                            <p className="text-sm font-medium">{delivery.destinationAddress}</p>
                            <p className="text-xs text-gray-500">{delivery.destinationCity}, {delivery.destinationState} {delivery.destinationZip}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex md:flex-col gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                      <Link href={`/driver/delivery/${delivery.id}`} className="w-full">
                        <Button className="w-full md:w-32">View Details</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
