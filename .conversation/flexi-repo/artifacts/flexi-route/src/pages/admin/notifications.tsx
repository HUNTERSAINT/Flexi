import React from 'react';
import Notifications from '@/pages/customer/notifications';

// Re-using the same layout since the hook automatically uses the current user's token 
// and the notifications endpoint is role-agnostic on the backend for personal notifications
// Admin-wide system notifications would be similarly fetched.

export default function AdminNotifications() {
  return (
    <div className="pt-2">
      <Notifications />
    </div>
  );
}
