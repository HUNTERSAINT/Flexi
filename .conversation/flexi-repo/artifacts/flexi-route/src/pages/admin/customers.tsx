import React, { useState } from 'react';
import { useListUsers, useUpdateUser } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, Loader2, User, Phone, Mail, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { getListUsersQueryKey } from '@workspace/api-client-react';
import { Switch } from '@/components/ui/switch';

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  
  const { data: usersResponse, isLoading } = useListUsers({
    role: 'customer',
    search: search || undefined
  });

  const users = usersResponse?.data || [];
  const queryClient = useQueryClient();
  const updateUser = useUpdateUser();

  const toggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await updateUser.mutateAsync({ id, data: { isActive: !currentStatus } });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (e) {
      toast.error('Failed to update user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Customers</h1>
          <p className="text-gray-500 mt-1">Manage registered customers and their accounts.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by name or email..." 
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
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-10"><Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-500">No customers found</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50/50 ${!user.isActive ? 'opacity-70' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.name[0]}
                        </div>
                        <div className="font-medium text-secondary">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-gray-600 text-xs">
                        <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {user.email}</div>
                        {user.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {user.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{format(new Date(user.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className={`text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {user.isActive ? 'Active' : 'Suspended'}
                        </span>
                        <Switch 
                          checked={user.isActive} 
                          onCheckedChange={() => toggleActive(user.id, user.isActive || false)}
                          disabled={updateUser.isPending}
                        />
                      </div>
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
