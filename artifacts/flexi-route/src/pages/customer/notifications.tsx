import React from 'react';
import { useListNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Package, CreditCard, Info, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { getListNotificationsQueryKey } from '@workspace/api-client-react';
import { toast } from 'sonner';

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data: notificationsData, isLoading } = useListNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  const notifications = notificationsData || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleMarkRead = async (id: number, isRead: boolean) => {
    if (isRead) return;
    try {
      await markRead.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    } catch (e) {
      // ignore
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'shipment_update': return <Package className="h-5 w-5 text-primary" />;
      case 'payment_update': return <CreditCard className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated on your shipments and account activity.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
            <Check className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : notifications.length === 0 ? (
        <Card className="border-dashed shadow-none bg-gray-50/50">
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary">All caught up!</h3>
            <p className="text-gray-500">You don't have any notifications right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {notifications.map(notification => (
              <div 
                key={notification.id} 
                onClick={() => handleMarkRead(notification.id, notification.isRead)}
                className={`p-6 flex gap-4 transition-colors cursor-pointer ${notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-primary/5 hover:bg-primary/10'}`}
              >
                <div className="shrink-0 mt-1">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${notification.isRead ? 'bg-gray-100' : 'bg-white shadow-sm'}`}>
                    {getIcon(notification.type)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-semibold ${notification.isRead ? 'text-gray-700' : 'text-secondary'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm ${notification.isRead ? 'text-gray-500' : 'text-gray-700'}`}>
                    {notification.message}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="shrink-0 flex items-center justify-center w-4">
                    <div className="h-2.5 w-2.5 bg-primary rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
