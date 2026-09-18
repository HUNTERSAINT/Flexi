import React, { useState } from 'react';
import {
  getListShipmentStatusesQueryKey,
  getListShipmentsQueryKey,
  useCreateShipmentStatus,
  useListShipmentStatuses,
  useListShipments,
  useUpdateShipment,
  useAssignDriver,
  useListDrivers,
} from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, MoreVertical, Loader2, Truck, UserPlus, Plus } from 'lucide-react';
import { format } from 'date-fns';

const FALLBACK_TIME_ZONES = [
  'UTC',
  'Africa/Lagos',
  'America/New_York',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const supportedTimeZones = (Intl as any).supportedValuesOf;
const TIME_ZONES = Array.from(new Set([
  'UTC',
  ...(typeof supportedTimeZones === 'function' ? supportedTimeZones('timeZone') : FALLBACK_TIME_ZONES),
]));

function getDefaultTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function getDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const values: Record<string, string> = {};
  parts.forEach(({ type, value }) => { values[type] = value; });
  return values;
}

function formatDateTimeLocal(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone);
  return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute;
}

function dateTimeLocalToIso(value: string, timeZone: string) {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = (datePart || '').split('-').map(Number);
  const [hour, minute] = (timePart || '').split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) throw new Error('Enter a valid date and time');

  // Resolve the wall-clock value in the selected timezone to a UTC instant.
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  let instant = wallClock;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getDateTimeParts(new Date(instant), timeZone);
    const representedWallClock = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    instant = wallClock - (representedWallClock - instant);
  }
  return new Date(instant).toISOString();
}
import { useQueryClient } from '@tanstack/react-query';

type StatusOption = {
  value: string;
  label: string;
  isSystem?: boolean;
};

const FALLBACK_STATUSES: StatusOption[] = [
  { value: 'pending', label: 'Pending', isSystem: true },
  { value: 'confirmed', label: 'Confirmed', isSystem: true },
  { value: 'processing', label: 'Processing', isSystem: true },
  { value: 'in_transit', label: 'In Transit', isSystem: true },
  { value: 'out_for_delivery', label: 'Out for Delivery', isSystem: true },
  { value: 'arrived_at_location', label: 'Arrived at location', isSystem: true },
  { value: 'delivered', label: 'Delivered', isSystem: true },
  { value: 'cancelled', label: 'Cancelled', isSystem: true },
];

export default function AdminShipments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newStatusLabel, setNewStatusLabel] = useState('');
  
  const { data: shipmentsData, isLoading } = useListShipments({
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    search: search || undefined
  });
  const { data: fetchedStatuses = [] } = useListShipmentStatuses();
  const createShipmentStatus = useCreateShipmentStatus();
  const queryClient = useQueryClient();

  const shipments = shipmentsData?.data || [];
  const statusOptions: StatusOption[] = fetchedStatuses.length > 0 ? fetchedStatuses : FALLBACK_STATUSES;

  const handleCreateStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    const label = newStatusLabel.trim();
    if (!label) {
      toast.error('Enter a status name');
      return;
    }
    try {
      await createShipmentStatus.mutateAsync({ data: { label } });
      await queryClient.invalidateQueries({ queryKey: getListShipmentStatusesQueryKey() });
      setNewStatusLabel('');
      toast.success(`Status "${label}" added`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not add status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Shipment Management</h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <h2 className="text-lg font-semibold text-secondary">Shipment statuses</h2>
              <p className="text-sm text-gray-500 mt-1">
                Add a custom status for your operations. It will be available in shipment filters and status actions.
              </p>
            </div>
            <form onSubmit={handleCreateStatus} className="flex w-full lg:w-auto gap-2">
              <Input
                value={newStatusLabel}
                onChange={(event) => setNewStatusLabel(event.target.value)}
                placeholder="e.g. Awaiting customs"
                maxLength={60}
                className="min-w-0 lg:w-72"
                disabled={createShipmentStatus.isPending}
              />
              <Button type="submit" disabled={createShipmentStatus.isPending || !newStatusLabel.trim()}>
                {createShipmentStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add status
              </Button>
            </form>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {statusOptions.map((status) => (
              <StatusBadge key={status.value} status={status.value} label={status.label} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search tracking, city, or customer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 text-gray-500 font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Tracking</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Route</th>
                  <th className="px-6 py-4">Driver</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-10"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" /></td></tr>
                ) : shipments.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-500">No shipments found</td></tr>
                ) : shipments.map(shipment => (
                  <tr key={shipment.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono font-medium">{shipment.trackingNumber}</td>
                    <td className="px-6 py-4">{shipment.customerName}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <span className="font-medium">{shipment.originCity}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="font-medium">{shipment.destinationCity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {shipment.driverName ? (
                        <div className="flex items-start gap-2 text-xs">
                          <Truck className="h-3 w-3 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{shipment.driverName}</span>
                              <span className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Assigned</span>
                            </div>
                            <p className="text-gray-500 truncate">{shipment.driverEmail || 'No email'}</p>
                            {shipment.driverPhone && <p className="text-gray-500 truncate">{shipment.driverPhone}</p>}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={shipment.status as any} /></td>
                    <td className="px-6 py-4 text-gray-500">{format(new Date(shipment.createdAt), 'MMM d')}</td>
                     <td className="px-6 py-4 text-right">
                       <ShipmentActions shipment={shipment} statusOptions={statusOptions} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ShipmentActions({ shipment, statusOptions }: { shipment: any; statusOptions: StatusOption[] }) {
  const queryClient = useQueryClient();
  const updateShipment = useUpdateShipment();
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [statusDialog, setStatusDialog] = useState<StatusOption | null>(null);
  const [statusDateTime, setStatusDateTime] = useState('');
  const [statusTimezone, setStatusTimezone] = useState(getDefaultTimeZone());

  const openStatusDialog = (status: StatusOption) => {
    const timezone = getDefaultTimeZone();
    setStatusDialog(status);
    setStatusTimezone(timezone);
    setStatusDateTime(formatDateTimeLocal(new Date(), timezone));
  };

  const handleStatusChange = async () => {
    if (!statusDialog || !statusDateTime) return;

    let statusUpdatedAt: string;
    try {
      statusUpdatedAt = dateTimeLocalToIso(statusDateTime, statusTimezone);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enter a valid date and time');
      return;
    }

    try {
      await updateShipment.mutateAsync({
        id: shipment.id,
        data: { status: statusDialog.value, statusUpdatedAt, statusTimezone },
      });
      queryClient.setQueryData(getListShipmentsQueryKey(), (old: any) => {
        if (!old || !old.data) return old;
        return { ...old, data: old.data.map((s: any) => s.id === shipment.id ? { ...s, status: statusDialog.value } : s) };
      });
      toast.success('Status updated to ' + statusDialog.label + ' (' + statusTimezone + ')');
      setStatusDialog(null);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setIsAssignOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Assign Driver
          </DropdownMenuItem>
          <div className="border-t border-gray-100 my-1"></div>
           {statusOptions
             .filter((status) => status.value !== 'pending')
             .map((status) => (
               <DropdownMenuItem
                 key={status.value}
                 onClick={() => openStatusDialog(status)}
                 className={status.value === 'cancelled' ? 'text-red-600' : undefined}
               >
                 Set {status.label}
               </DropdownMenuItem>
             ))}
        </DropdownMenuContent>
      </DropdownMenu>


      <Dialog open={!!statusDialog} onOpenChange={(open) => { if (!open && !updateShipment.isPending) setStatusDialog(null); }}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle>Set {statusDialog?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-500">Choose when this status update happened. The selected timezone will be used to interpret the date and time.</p>
            <div className="space-y-2">
              <label htmlFor="status-date-time" className="text-sm font-medium">Date and time</label>
              <Input id="status-date-time" type="datetime-local" value={statusDateTime} onChange={(e) => setStatusDateTime(e.target.value)} disabled={updateShipment.isPending} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <Select value={statusTimezone} onValueChange={setStatusTimezone} disabled={updateShipment.isPending}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {TIME_ZONES.map((timezone) => <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setStatusDialog(null)} disabled={updateShipment.isPending}>Cancel</Button>
              <Button onClick={handleStatusChange} disabled={!statusDateTime || updateShipment.isPending}>
                {updateShipment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AssignDriverDialog 
        shipmentId={shipment.id} 
        currentDriverId={shipment.driverId} 
        open={isAssignOpen} 
        onOpenChange={setIsAssignOpen} 
      />
    </>
  );
}

function AssignDriverDialog({ shipmentId, currentDriverId, open, onOpenChange }: any) {
  const queryClient = useQueryClient();
  const { data: driversResponse } = useListDrivers({ isAvailable: true });
  const assignDriver = useAssignDriver();
  const [selected, setSelected] = useState<string>(currentDriverId?.toString() || "");

  const handleAssign = async () => {
    if (!selected) return;
    try {
      await assignDriver.mutateAsync({ 
        id: shipmentId, 
        data: { driverId: parseInt(selected) } 
      });
      queryClient.invalidateQueries({ queryKey: getListShipmentsQueryKey() });
      toast.success("Driver assigned successfully");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to assign driver");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Select an available driver" />
            </SelectTrigger>
            <SelectContent>
              {(driversResponse as any)?.map((driver: any) => (
                <SelectItem key={driver.id} value={driver.id.toString()}>
                  {driver.name} ({driver.vehicleType || 'No vehicle'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="w-full" onClick={handleAssign} disabled={!selected || assignDriver.isPending}>
            {assignDriver.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Assignment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
