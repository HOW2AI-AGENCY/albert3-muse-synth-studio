import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Настройки</h1>
        <p className="text-muted-foreground">Управляйте вашим профилем и настройками аккаунта.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
          <CardDescription>Эта информация будет видна другим пользователям.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Имя пользователя</Label>
            <Input id="username" placeholder="Ваше уникальное имя" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram">Telegram</Label>
            <Input id="telegram" placeholder="@username" />
          </div>

          <div className="space-y-2">
            <Label>Аватар</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Button variant="outline" disabled>Загрузить новый</Button>
            </div>
          </div>

          <Button disabled>Сохранить изменения</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Аккаунт</CardTitle>
          <CardDescription>Управление настройками вашего аккаунта.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Выход..." : "Выйти из аккаунта"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
