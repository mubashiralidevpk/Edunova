import { useState } from 'react';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCheckinSystem } from '@/hooks/useCheckinSystem';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { notifications, unreadCount, markNotificationRead, markAllRead } = useCheckinSystem();
  const [open, setOpen] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert': return '⚠️';
      case 'replacement': return '🔄';
      case 'absence': return '❌';
      case 'info': return '📢';
      default: return '🔔';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive-foreground text-background text-xs flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-card border-primary/10" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No notifications</p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.slice(0, 20).map(notif => (
                <button
                  key={notif.id}
                  className={cn(
                    "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                    !notif.is_read && "bg-primary/5"
                  )}
                  onClick={() => markNotificationRead(notif.id)}
                >
                  <div className="flex gap-2">
                    <span className="text-sm">{getTypeIcon(notif.notification_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !notif.is_read && "font-semibold")}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {format(new Date(notif.created_at), 'h:mm a')}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
