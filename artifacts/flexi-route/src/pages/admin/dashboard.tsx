import React from 'react';
import { useGetAdminAnalytics } from '@workspace/api-client-react';
import { StatCard } from '@/components/ui/stat-card';
import { Package, Users, Truck, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useGetAdminAnalytics();

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!analytics) return null;

  // Format data for chart
  const chartData = analytics.shipmentsByStatus.map(stat => ({
    name: stat.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: stat.count,
    originalStatus: stat.status
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#eab308'; // yellow-500
      case 'confirmed': return '#22c55e'; // green-500
      case 'processing': return '#3b82f6'; // blue-500
      case 'in_transit': return '#0ea5e9'; // sky-500
      case 'out_for_delivery': return '#6366f1'; // indigo-500
      case 'delivered': return '#10b981'; // emerald-500
      case 'cancelled': return '#ef4444'; // red-500
      default: return '#94a3b8'; // slate-400
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-secondary tracking-tight">Admin Overview</h1>
        <p className="text-gray-500 mt-1">Platform analytics and operational metrics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Revenue" value={`$${analytics.totalRevenue.toLocaleString()}`} icon={DollarSign} className="border-green-100 bg-green-50/30" />
        <StatCard title="Total Shipments" value={analytics.totalShipments} icon={Package} />
        <StatCard title="This Month" value={analytics.shipmentsThisMonth || 0} icon={TrendingUp} />
        <StatCard title="Total Customers" value={analytics.totalCustomers} icon={Users} />
        <StatCard title="Active Drivers" value={analytics.totalDrivers} icon={Truck} />
        <StatCard title="Pending Payments" value={analytics.pendingPayments || 0} icon={AlertCircle} className="border-orange-100 bg-orange-50/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-1 lg:col-span-2 shadow-sm">
          <CardHeader className="border-b border-gray-50">
            <CardTitle>Recent Shipments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="px-4 py-3">Tracking</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analytics.recentShipments.slice(0, 6).map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono font-medium text-secondary">{shipment.trackingNumber}</td>
                      <td className="px-4 py-3 truncate max-w-[120px]">{shipment.customerName || 'Unknown'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {shipment.originCity} → {shipment.destinationCity}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={shipment.status as any} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="border-b border-gray-50">
            <CardTitle>Shipments by Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.originalStatus)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
