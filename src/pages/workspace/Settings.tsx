import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, User, LogOut, Bell, Shield, Palette, Database } from "@/utils/iconImports";
import { logger } from "@/utils/logger";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrateTracks = async () => {
    setIsMigrating(true);
    try {
      toast({
        title: "Миграция началась...",
        description: "Это может занять несколько минут",
      });

      const { data, error } = await supabase.functions.invoke('migrate-tracks-to-storage');

      if (error) throw error;

      toast({
        title: "Миграция завершена",
        description: `Перенесено: ${data?.migrated || 0}, Ошибок: ${data?.failed || 0}`,
      });
    } catch (error) {
      logger.error('Migration error', error instanceof Error ? error : new Error(String(error)), 'Settings');
      toast({
        title: "Ошибка миграции",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Успешно",
          description: "Вы вышли из аккаунта",
        });
        navigate("/");
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 animate-slide-up">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl blur-xl animate-pulse-glow" />
          <div className="relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-primary/20">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gradient-primary">Настройки</h1>
          <p className="text-muted-foreground mt-1">Управляйте вашим профилем и настройками</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card variant="glass" className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-gradient-primary">Профиль</CardTitle>
          </div>
          <CardDescription>Эта информация будет видна другим пользователям</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground font-medium">Имя пользователя</Label>
            <Input 
              id="username" 
              placeholder="Ваше уникальное имя" 
              className="bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram" className="text-foreground font-medium">Telegram</Label>
            <Input 
              id="telegram" 
              placeholder="@username" 
              className="bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Аватар</Label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-primary rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                <Avatar className="h-16 w-16 ring-2 ring-primary/20 relative">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="bg-gradient-primary text-white font-bold">МП</AvatarFallback>
                </Avatar>
              </div>
              <Button variant="modern" disabled>Загрузить новый</Button>
            </div>
          </div>

          <Button variant="hero" disabled className="shadow-glow-primary">Сохранить изменения</Button>
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card variant="modern" className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-secondary" />
            <CardTitle>Уведомления</CardTitle>
          </div>
          <CardDescription>Настройте, как вы хотите получать уведомления</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email уведомления</p>
              <p className="text-sm text-muted-foreground">Получать уведомления на почту</p>
            </div>
            <Button variant="outline" size="sm" disabled>Скоро</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Push уведомления</p>
              <p className="text-sm text-muted-foreground">Получать push-уведомления</p>
            </div>
            <Button variant="outline" size="sm" disabled>Скоро</Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card variant="modern" className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-accent" />
            <CardTitle>Внешний вид</CardTitle>
          </div>
          <CardDescription>Настройте тему и внешний вид приложения</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Тема оформления</p>
              <p className="text-sm text-muted-foreground">Выберите светлую или тёмную тему</p>
            </div>
            <Button variant="outline" size="sm" disabled>Скоро</Button>
          </div>
        </CardContent>
      </Card>

      {/* Storage Migration Card */}
      <Card variant="modern" className="animate-scale-in" style={{ animationDelay: '0.35s' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            <CardTitle>Миграция треков</CardTitle>
          </div>
          <CardDescription>
            Перенести старые треки в Supabase Storage для долгосрочного хранения
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleMigrateTracks}
            disabled={isMigrating}
            variant="outline"
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            {isMigrating ? "Миграция..." : "Запустить миграцию"}
          </Button>
        </CardContent>
      </Card>

      {/* Account Card */}
      <Card variant="elevated" className="border-destructive/20 animate-scale-in" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Аккаунт</CardTitle>
          </div>
          <CardDescription>Управление настройками вашего аккаунта</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="gap-2 hover:scale-105 transition-all duration-300"
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? "Выход..." : "Выйти из аккаунта"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
