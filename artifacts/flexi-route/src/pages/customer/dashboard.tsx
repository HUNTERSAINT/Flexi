import React from 'react';
import { useAuth } from '@/lib/auth';
import { useListShipments } from '@workspace/api-client-react';
import { StatCard } from '@/components/ui/stat-card';
import { Package, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function CustomerDashboard() {
  const { user } = useAuth();
  
  const { data: shipmentsData, isLoading } = useListShipments(
    { limit: 5 },
    { query: { enabled: !!user } }
  );

  const shipments = shipmentsData?.data || [];
  
  // Aggregate stats (mocked aggregation based on list, normally API would provide summary)
  const total = shipmentsData?.total || 0;
  const inTransit = shipments.filter(s => ['in_transit', 'out_for_delivery'].includes(s.status)).length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const pending = shipments.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-gray-500 mt-1">Here is the overview of your shipments.</p>
        </div>
        <Link href="/dashboard/book">
          <Button className="shrink-0 bg-primary text-white font-medium shadow-sm hover:bg-primary/90">
            <Package className="mr-2 h-4 w-4" /> Book New Shipment
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Shipments" value={total} icon={Package} />
        <StatCard title="In Transit" value={inTransit} icon={Truck} />
        <StatCard title="Delivered" value={delivered} icon={CheckCircle2} />
        <StatCard title="Pending Action" value={pending} icon={AlertCircle} className="border-orange-100 bg-orange-50/30" />
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardHeader className="border-b border-gray-50 bg-gray-50/50 flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold">Recent Shipments</CardTitle>
          <Link href="/dashboard/shipments">
            <Button variant="ghost" size="sm" className="text-primary font-medium hover:bg-primary/10">View All</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading shipments...</div>
          ) : shipments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-secondary mb-1">No shipments yet</h3>
              <p className="text-gray-500 mb-6">Book your first shipment to see it here.</p>
              <Link href="/dashboard/book">
                <Button>Book Shipment</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Tracking Number</th>
                    <th className="px-6 py-4">Route</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 font-mono font-medium text-secondary">
                        <Link href={`/dashboard/tracking/${shipment.trackingNumber}`} className="hover:text-primary transition-colors">
                          {shipment.trackingNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[120px]" title={shipment.originCity}>{shipment.originCity}</span>
                          <span className="text-gray-400">→</span>
                          <span className="truncate max-w-[120px] font-medium" title={shipment.destinationCity}>{shipment.destinationCity}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {format(new Date(shipment.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={shipment.status as any} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
