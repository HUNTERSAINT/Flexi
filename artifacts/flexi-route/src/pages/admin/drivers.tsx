import React, { useState } from 'react';
import { useListDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search, Loader2, Plus, Truck, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { getListDriversQueryKey } from '@workspace/api-client-react';

const driverSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email(),
  password: z.string().min(8, "Min 8 chars"),
  phone: z.string().optional(),
  vehicleType: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export default function AdminDrivers() {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const { data: driversResponse, isLoading } = useListDrivers({
    search: search || undefined
  });

  // API returns Driver[] directly (not {data: Driver[]})
  const drivers = (driversResponse as any) || [];
  const queryClient = useQueryClient();
  const updateDriver = useUpdateDriver();
  const deleteDriver = useDeleteDriver();

  const toggleAvailability = async (id: number, current: boolean) => {
    try {
      await updateDriver.mutateAsync({ id, data: { isAvailable: !current } });
      queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
      toast.success("Availability updated");
    } catch (e) {
      toast.error("Failed to update availability");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;
    try {
      await deleteDriver.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
      toast.success("Driver deleted");
    } catch (e) {
      toast.error("Failed to delete driver");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Drivers Fleet</h1>
        </div>
        <AddDriverDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search drivers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 text-gray-500 font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Driver Info</th>
                  <th className="px-6 py-4">Vehicle & License</th>
                  <th className="px-6 py-4 text-center">Deliveries</th>
                  <th className="px-6 py-4 text-center">Available</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-10"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" /></td></tr>
                ) : drivers.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-500">No drivers found</td></tr>
                ) : drivers.map(driver => (
                  <tr key={driver.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-secondary">{driver.name}</div>
                      <div className="text-gray-500 text-xs">{driver.email}</div>
                      <div className="text-gray-500 text-xs">{driver.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{driver.vehicleType || 'N/A'}</span>
                      </div>
                      <div className="text-gray-500 text-xs font-mono">{driver.licenseNumber || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-secondary font-bold">
                      {driver.totalDeliveries || 0}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch 
                        checked={driver.isAvailable} 
                        onCheckedChange={() => toggleAvailability(driver.id, driver.isAvailable)}
                        disabled={updateDriver.isPending}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(driver.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

function AddDriverDialog({ open, onOpenChange }: any) {
  const form = useForm({
    resolver: zodResolver(driverSchema),
    defaultValues: { name: '', email: '', password: '', phone: '', vehicleType: '', licenseNumber: '' }
  });
  const createDriver = useCreateDriver();
  const queryClient = useQueryClient();

  const onSubmit = async (data: any) => {
    try {
      await createDriver.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getListDriversQueryKey() });
      toast.success("Driver added successfully");
      form.reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.data?.error || "Failed to add driver");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-white"><Plus className="mr-2 h-4 w-4" /> Add Driver</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Driver</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="name" render={({field}) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({field}) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({field}) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage/></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({field}) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
              )} />
              <FormField control={form.control} name="vehicleType" render={({field}) => (
                <FormItem><FormLabel>Vehicle (e.g. Van, Truck)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="licenseNumber" render={({field}) => (
              <FormItem><FormLabel>License Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={createDriver.isPending}>
              {createDriver.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Driver Account
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
