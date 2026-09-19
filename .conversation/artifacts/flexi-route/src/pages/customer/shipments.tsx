import React, { useState } from 'react';
import { getListShipmentsQueryKey, useListShipments } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { Package, Search, ChevronRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function MyShipments() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: shipmentsData, isLoading } = useListShipments(
    { 
      status: statusFilter === 'all' ? undefined : statusFilter as any,
      limit: 50
    },
    { query: { queryKey: getListShipmentsQueryKey({
      status: statusFilter === 'all' ? undefined : statusFilter as any,
      limit: 50
    }), enabled: !!user, placeholderData: (previous) => previous } }
  );

  const shipments = shipmentsData?.data || [];

  const filteredShipments = search 
    ? shipments.filter(s => 
        s.trackingNumber.toLowerCase().includes(search.toLowerCase()) || 
        s.destinationCity?.toLowerCase().includes(search.toLowerCase()) ||
        s.originCity?.toLowerCase().includes(search.toLowerCase())
      )
    : shipments;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-secondary tracking-tight">My Shipments</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <Tabs defaultValue="all" onValueChange={setStatusFilter} className="w-full sm:w-auto">
          <TabsList className="bg-gray-100/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in_transit">In Transit</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search tracking or city..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-50 border-transparent focus-visible:bg-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredShipments.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 shadow-none bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-secondary mb-1">No shipments found</h3>
            <p className="text-gray-500 mb-6">We couldn't find any shipments matching your filters.</p>
            {statusFilter !== 'all' || search ? (
              <button 
                onClick={() => { setStatusFilter('all'); setSearch(''); }}
                className="text-primary font-medium hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredShipments.map((shipment, i) => (
            <Link key={shipment.id} href={`/dashboard/tracking/${shipment.trackingNumber}`}>
              <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 50}ms` }}>
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                      <Package className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono font-bold text-secondary">{shipment.trackingNumber}</span>
                        <StatusBadge status={shipment.status as any} />
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="font-medium">{shipment.originCity}</span>
                        <span className="text-gray-300">→</span>
                        <span className="font-medium">{shipment.destinationCity}</span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="capitalize">{shipment.serviceType}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-gray-100 gap-6">
                    <div className="text-sm text-gray-500 text-left sm:text-right">
                      <p className="mb-0.5 text-xs uppercase tracking-wider text-gray-400">Created</p>
                      <p className="font-medium text-secondary">{format(new Date(shipment.createdAt), 'MMM d, yyyy')}</p>
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
