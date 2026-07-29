import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTrackShipment } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, CheckCircle2, Clock, Truck, Package, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';

export default function Track() {
  const [locationPath] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTracking = searchParams.get('number') || '';
  
  const [trackingInput, setTrackingInput] = useState(initialTracking);
  const [activeTracking, setActiveTracking] = useState(initialTracking);

  const { data: trackingInfo, isLoading, isError, error } = useTrackShipment(
    activeTracking,
    {
      query: {
        enabled: !!activeTracking,
        retry: false
      }
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingInput.trim()) {
      setActiveTracking(trackingInput.trim());
      // Update URL without full reload
      window.history.pushState({}, '', `/track?number=${encodeURIComponent(trackingInput.trim())}`);
    }
  };

  useEffect(() => {
    // Sync active state if URL changes externally
    const currentParams = new URLSearchParams(window.location.search);
    const num = currentParams.get('number');
    if (num && num !== activeTracking) {
      setTrackingInput(num);
      setActiveTracking(num);
    }
  }, [window.location.search]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary mb-4">Track Your Shipment</h1>
          <p className="text-gray-600 text-lg">Enter your Flexi Route tracking number to see real-time updates.</p>
        </div>

        <Card className="mb-8 border-none shadow-md">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input 
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="e.g., FR-123456789"
                  className="pl-12 h-14 text-lg"
                  data-testid="input-tracking-number"
                />
              </div>
              <Button type="submit" size="lg" className="h-14 px-8" disabled={isLoading} data-testid="button-track-submit">
                {isLoading ? 'Tracking...' : 'Track Package'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl flex items-start gap-4">
            <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lg">Shipment Not Found</h3>
              <p className="mt-1">We couldn't find a shipment matching "{activeTracking}". Please check the number and try again.</p>
            </div>
          </div>
        )}

        {trackingInfo && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Card */}
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

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
              <h3 className="text-xl font-bold text-secondary mb-8">Tracking History</h3>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
