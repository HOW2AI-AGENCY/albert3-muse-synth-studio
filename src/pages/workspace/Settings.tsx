import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, User, LogOut, Bell, Shield, Palette, Database } from "@/utils/iconImports";
import PersonalizationSettings from "@/components/settings/PersonalizationSettings";

const Settings = () => {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isMigratingVersions, setIsMigratingVersions] = useState(false);

  const handleMigrateTracks = async () => {
    setIsMigrating(true);
    try {
      toast.success("Миграция началась...", {
        description: "Это может занять несколько минут",
      });

      const { data, error } = await SupabaseFunctions.invoke('migrate-tracks-to-storage');

      if (error) throw error;

      toast.success("Миграция завершена", {
        description: `Перенесено: ${(data as any)?.migrated || 0}, Ошибок: ${(data as any)?.failed || 0}`,
      });
    } catch (error) {
      logger.error('Migration error', error instanceof Error ? error : new Error(String(error)), 'Settings');
      toast.error("Ошибка миграции", {
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateVersions = async () => {
    setIsMigratingVersions(true);
    try {
      toast.success("Восстановление версий...", {
        description: "Запрашиваем данные из Suno API",
      });

      const { data, error } = await SupabaseFunctions.invoke('migrate-track-versions');

      if (error) throw error;

      toast.success("Версии восстановлены", {
        description: `Треков: ${(data as any)?.migrated || 0}, Ошибок: ${(data as any)?.failed || 0}`,
      });
    } catch (error) {
      logger.error('Version migration error', error instanceof Error ? error : new Error(String(error)), 'Settings');
      toast.error("Ошибка восстановления версий", {
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setIsMigratingVersions(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Ошибка", {
          description: error.message,
        });
      } else {
        toast.success("Успешно", {
          description: "Вы вышли из аккаунта",
        });
        navigate("/");
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Настройки</h1>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Внешний вид</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Профиль</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Уведомления</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Дополнительно</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6 mt-6">
          <PersonalizationSettings />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Профиль</CardTitle>
              </div>
              <CardDescription>
                Управление информацией профиля
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Настройки профиля будут доступны в следующем обновлении.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Настройки уведомлений</CardTitle>
              </div>
              <CardDescription>
                Управление уведомлениями и алертами
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Настройки уведомлений будут доступны в следующем обновлении.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6 mt-6">
          {/* Version Recovery Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>Восстановление версий</CardTitle>
              </div>
              <CardDescription>
                Запросить из Suno API и восстановить версии для старых треков
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Для треков, у которых нет версий, будет сделан запрос к Suno API по suno_id. 
                Восстановит обе версии (V1 и V2) где возможно.
              </p>
              <Button
                onClick={handleMigrateVersions}
                disabled={isMigratingVersions}
                variant="default"
                className="gap-2"
              >
                <Database className="h-4 w-4" />
                {isMigratingVersions ? "Восстановление..." : "Восстановить версии"}
              </Button>
            </CardContent>
          </Card>

          {/* Storage Migration Card */}
          <Card>
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
          <Card className="border-destructive/20">
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
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Выход..." : "Выйти из аккаунта"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
