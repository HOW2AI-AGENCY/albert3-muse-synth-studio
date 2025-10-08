import { Bell, Music, Heart, MessageCircle, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: "track" | "like" | "comment" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "track",
    title: "Трек готов",
    message: "Ваш трек 'Summer Vibes' успешно сгенерирован",
    time: "2 мин назад",
    read: false,
  },
  {
    id: "2",
    type: "like",
    title: "Новый лайк",
    message: "Пользователь отметил ваш трек 'Night Dreams'",
    time: "1 час назад",
    read: false,
  },
  {
    id: "3",
    type: "system",
    title: "Обновление",
    message: "Доступна новая версия приложения",
    time: "3 часа назад",
    read: true,
  },
];

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "track":
      return <Music className="h-4 w-4 text-primary" />;
    case "like":
      return <Heart className="h-4 w-4 text-red-500" />;
    case "comment":
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case "system":
      return <Bell className="h-4 w-4 text-accent" />;
  }
};

export const NotificationsDropdown = () => {
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative w-10 h-10 p-0 hover:bg-accent/10 rounded-xl transition-all duration-300 hover:scale-105"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs shadow-glow-primary animate-pulse-glow"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 bg-background/95 backdrop-blur-xl border-border/50 shadow-xl"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-base font-semibold">Уведомления</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Отметить все прочитанными
          </Button>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <ScrollArea className="h-[400px]">
          {mockNotifications.length > 0 ? (
            <div className="space-y-1">
              {mockNotifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                    !notification.read ? "bg-accent/5" : ""
                  }`}
                >
                  <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{notification.title}</p>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {notification.time}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Check className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">Нет новых уведомлений</p>
            </div>
          )}
        </ScrollArea>

        {mockNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center text-sm text-primary cursor-pointer hover:text-primary/80">
              Показать все уведомления
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
