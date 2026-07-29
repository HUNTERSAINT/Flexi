import React from 'react';
import { useLocation, useParams } from 'wouter';
import { useTrackShipment } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Package, Truck, CheckCircle2, MapPin, Clock, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function TrackShipmentDetail() {
  const { trackingNumber } = useParams();
  const [, setLocation] = useLocation();

  const { data: trackingInfo, isLoading, error } = useTrackShipment(
    trackingNumber || '',
    { query: { enabled: !!trackingNumber } }
  );

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !trackingInfo) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-secondary mb-2">Shipment Not Found</h2>
        <Button onClick={() => setLocation('/dashboard/shipments')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shipments
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" className="-ml-4 text-gray-500 hover:text-secondary" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <Card className="overflow-hidden border-none shadow-md">
        <div className="bg-secondary text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Tracking Number</p>
            <h2 className="text-2xl font-bold font-mono tracking-tight">{trackingInfo.trackingNumber}</h2>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Status</p>
              <StatusBadge status={trackingInfo.status as any} className="text-sm bg-white/20 text-white border-white/30" />
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">Service</p>
              <p className="font-semibold capitalize">{trackingInfo.serviceType || 'Standard'}</p>
            </div>
          </div>
        </div>
        <CardContent className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-gray-200 -translate-x-1/2"></div>
            
            <div className="flex items-start gap-4 relative z-10 bg-white">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border-4 border-white">
                <MapPin className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">ORIGIN</p>
                <p className="text-lg font-bold text-secondary mt-1">{trackingInfo.originCity}</p>
                {trackingInfo.originState && <p className="text-gray-600">{trackingInfo.originState}</p>}
              </div>
            </div>

            <div className="flex items-start gap-4 relative z-10 bg-white">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-4 border-white">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">DESTINATION</p>
                <p className="text-lg font-bold text-secondary mt-1">{trackingInfo.destinationCity}</p>
                {trackingInfo.destinationState && <p className="text-gray-600">{trackingInfo.destinationState}</p>}
              </div>
            </div>
          </div>
          
          {trackingInfo.estimatedDelivery && trackingInfo.status !== 'delivered' && (
            <div className="mt-8 pt-8 border-t border-gray-100 flex items-center gap-3 justify-center text-center">
              <Clock className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-gray-500">Estimated Delivery</p>
                <p className="text-xl font-bold text-secondary">
                  {format(new Date(trackingInfo.estimatedDelivery), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
        <h3 className="text-xl font-bold text-secondary mb-8">Tracking History</h3>
        {trackingInfo.events.length === 0 ? (
          <p className="text-gray-500 italic">No tracking events yet.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-gray-200 space-y-8 ml-4">
            {trackingInfo.events.map((event, idx) => {
              const isFirst = idx === 0;
              const isDelivered = event.status === 'delivered';
              
              let EventIcon = Package;
              if (isDelivered) EventIcon = CheckCircle2;
              else if (event.status === 'in_transit') EventIcon = Truck;
              
              return (
                <div key={event.id} className="relative">
                  <div className={`absolute -left-[35px] h-4 w-4 rounded-full border-4 border-white shadow-sm ${isFirst ? 'bg-primary' : 'bg-gray-300'}`}></div>
                  
                  <div className={`flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 ${isFirst ? 'opacity-100' : 'opacity-70'}`}>
                    <div className="w-40 shrink-0">
                      <p className="font-semibold text-secondary">{format(new Date(event.createdAt), 'MMM d, yyyy')}</p>
                      <p className="text-sm text-gray-500">{format(new Date(event.createdAt), 'h:mm a')}</p>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <p className="font-semibold text-secondary flex items-center gap-2">
                        <EventIcon className={`h-4 w-4 ${isFirst ? 'text-primary' : 'text-gray-500'}`} />
                        {event.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                      {event.location && (
                        <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
