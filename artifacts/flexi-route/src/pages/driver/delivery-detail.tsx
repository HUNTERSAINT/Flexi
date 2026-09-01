import React, { useState } from 'react';
import { useGetShipment, useGetShipmentEvents, useUpdateShipment, useAddTrackingEvent, useUploadDeliveryProof } from '@workspace/api-client-react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MapPin, Navigation, Package, ArrowLeft, Loader2, Camera, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetShipmentQueryKey, getGetShipmentEventsQueryKey } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function DeliveryDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const shipmentId = parseInt(id || '0');

  const { data: shipment, isLoading: isShipmentLoading } = useGetShipment(shipmentId, { query: { queryKey: getGetShipmentQueryKey(shipmentId), enabled: !!shipmentId } });
  const { data: eventsResponse } = useGetShipmentEvents(shipmentId, { query: { queryKey: getGetShipmentEventsQueryKey(shipmentId), enabled: !!shipmentId } });

  if (isShipmentLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!shipment) return <div>Delivery not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Button variant="ghost" className="-ml-4 text-gray-500" onClick={() => setLocation('/driver/deliveries')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Deliveries
      </Button>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-6">
          {/* Main Info */}
          <Card className="border-none shadow-md overflow-hidden">
            <div className="bg-secondary text-white p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Tracking Number</p>
                <h2 className="text-2xl font-bold font-mono">{shipment.trackingNumber}</h2>
              </div>
              <StatusBadge status={shipment.status as any} className="bg-white/20 text-white border-none text-sm" />
            </div>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                <div className="hidden sm:block absolute left-1/2 top-4 bottom-4 w-px bg-gray-100 -translate-x-1/2"></div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-500 font-semibold uppercase tracking-wider text-xs">
                    <MapPin className="h-4 w-4" /> Pickup Origin
                  </div>
                  <div>
                    <p className="font-medium text-secondary">{shipment.originAddress}</p>
                    <p className="text-gray-600 text-sm mt-0.5">{shipment.originCity}, {shipment.originState} {shipment.originZip}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary font-semibold uppercase tracking-wider text-xs">
                    <Navigation className="h-4 w-4" /> Dropoff Destination
                  </div>
                  <div>
                    <p className="font-medium text-secondary">{shipment.destinationAddress}</p>
                    <p className="text-gray-600 text-sm mt-0.5">{shipment.destinationCity}, {shipment.destinationState} {shipment.destinationZip}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Weight & Dimensions</p>
                  <p className="font-medium text-secondary">{shipment.weightKg} kg {shipment.dimensions && `• ${shipment.dimensions}`}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Service Type</p>
                  <p className="font-medium text-secondary capitalize">{shipment.serviceType}</p>
                </div>
                {shipment.customerName && (
                  <div className="col-span-2 mt-2 bg-gray-50 p-4 rounded-lg flex items-center gap-3">
                    <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shrink-0 border border-gray-200">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Customer</p>
                      <p className="font-medium text-secondary">{shipment.customerName}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Panel */}
          {shipment.status !== 'delivered' && shipment.status !== 'cancelled' && (
            <UpdateStatusPanel shipment={shipment} />
          )}
        </div>

        {/* Timeline Sidebar */}
        <div className="w-full md:w-80 shrink-0 space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-secondary mb-6">Route Log</h3>
              <div className="relative pl-6 border-l-2 border-gray-100 space-y-6 ml-2">
                {eventsResponse?.map((event: any, i: number) => (
                  <div key={event.id} className="relative">
                    <div className={`absolute -left-[31px] h-3 w-3 rounded-full border-2 border-white ${i === 0 ? 'bg-primary' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">{format(new Date(event.createdAt), 'MMM d, h:mm a')}</p>
                      <p className="font-medium text-sm text-secondary">{event.status.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      {event.location && <p className="text-xs text-gray-400 mt-1 flex items-center"><MapPin className="h-3 w-3 mr-1" />{event.location}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function UpdateStatusPanel({ shipment }: { shipment: any }) {
  const [status, setStatus] = useState<string>(shipment.status);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const queryClient = useQueryClient();
  const updateShipment = useUpdateShipment();
  const addEvent = useAddTrackingEvent();
  const uploadProof = useUploadDeliveryProof();

  const handleUpdate = async () => {
    if (!description) {
      toast.error("Please provide a description of this update.");
      return;
    }

    try {
      // 1. Add event
      await addEvent.mutateAsync({
        id: shipment.id,
        data: { status: status as any, location, description }
      });

      // 2. Update status if changed
      if (status !== shipment.status) {
        await updateShipment.mutateAsync({
          id: shipment.id,
          data: { status: status as any }
        });
      }

      // 3. Upload proof if delivered and file selected
      if (status === 'delivered' && file) {
        const formData = new FormData();
        formData.append('file', file);
        await uploadProof.mutateAsync({ id: shipment.id, data: formData as any });
      }

      queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipment.id) });
      queryClient.invalidateQueries({ queryKey: getGetShipmentEventsQueryKey(shipment.id) });
      
      toast.success("Shipment updated successfully");
      setLocation('');
      setDescription('');
      setFile(null);
    } catch (e) {
      toast.error("Failed to update shipment");
    }
  };

  return (
    <Card className="shadow-md border-primary/20 bg-primary/5">
      <CardContent className="p-6 space-y-4">
        <h3 className="font-bold text-secondary text-lg">Post Update</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">New Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Current Location</label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Chicago Hub" className="mt-1 bg-white" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Update Note</label>
          <Textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="e.g. Package arrived at sorting facility..." 
            className="mt-1 bg-white"
          />
        </div>

        {status === 'delivered' && (
          <div className="p-4 bg-white rounded-lg border border-gray-200 mt-4">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4" /> Proof of Delivery (Photo)
            </label>
            <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
        )}

        <Button 
          className="w-full h-12 text-lg mt-2" 
          onClick={handleUpdate}
          disabled={updateShipment.isPending || addEvent.isPending || uploadProof.isPending}
        >
          {(updateShipment.isPending || addEvent.isPending || uploadProof.isPending) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Submit Update
        </Button>
      </CardContent>
    </Card>
  );
}
