import React, { useState } from 'react';
import { useGetMyDeliveries } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { MapPin, Truck, ChevronRight, Loader2, Package } from 'lucide-react';

export default function DriverDeliveries() {
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const { data: deliveriesResponse, isLoading } = useGetMyDeliveries({
    status: statusFilter === 'active' ? 'processing,in_transit,out_for_delivery' : 
            statusFilter === 'completed' ? 'delivered' : undefined
  });

  const deliveries = deliveriesResponse || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">All Deliveries</h1>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-fit">
        <Tabs defaultValue="active" onValueChange={setStatusFilter}>
          <TabsList className="bg-gray-100/50">
            <TabsTrigger value="active">Active Route</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All History</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : deliveries.length === 0 ? (
        <Card className="border-dashed shadow-none bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Truck className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-secondary mb-1">No deliveries found</h3>
            <p className="text-gray-500">You don't have any deliveries in this status.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {deliveries.map((delivery) => (
            <Link key={delivery.id} href={`/driver/delivery/${delivery.id}`}>
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-secondary">{delivery.trackingNumber}</span>
                        <StatusBadge status={delivery.status as any} />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span><span className="font-medium">From:</span> {delivery.originCity}</span>
                        </div>
                        <div className="hidden sm:block text-gray-300">→</div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          <span><span className="font-medium">To:</span> {delivery.destinationCity}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-0 border-gray-100 gap-6">
                    <div className="text-sm text-gray-500 text-left md:text-right">
                      <p className="mb-0.5 text-xs uppercase tracking-wider text-gray-400">Assigned</p>
                      <p className="font-medium text-secondary">{format(new Date(delivery.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
