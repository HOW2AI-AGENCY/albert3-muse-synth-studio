import { User, Settings, LogOut, HelpCircle, CreditCard, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface UserProfileDropdownProps {
  userEmail: string;
}

export const UserProfileDropdown = ({ userEmail }: UserProfileDropdownProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(currentTheme);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Выход выполнен",
      description: "Вы успешно вышли из аккаунта",
    });
    navigate("/");
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
    toast({
      title: `Тема изменена`,
      description: `Активирована ${newTheme === "dark" ? "тёмная" : "светлая"} тема`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-11 h-11 sm:w-10 sm:h-10 p-0 rounded-full hover:scale-105 transition-all duration-300"
        >
          <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-primary/20 flex items-center justify-center hover:border-primary/40 transition-all duration-300">
            <User className="h-5 w-5 text-primary" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 bg-background/95 backdrop-blur-xl border-border/50 shadow-xl"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {userEmail.split("@")[0] || "Пользователь"}
            </p>
            <p className="text-xs text-muted-foreground truncate" title={userEmail}>
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => navigate("/workspace/settings")}
          className="cursor-pointer gap-2"
        >
          <Settings className="h-4 w-4" />
          <span>Настройки</span>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer gap-2">
          <CreditCard className="h-4 w-4" />
          <span>Подписка</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer gap-2">
          {theme === "dark" ? (
            <>
              <Sun className="h-4 w-4" />
              <span>Светлая тема</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              <span>Тёмная тема</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="cursor-pointer gap-2">
          <HelpCircle className="h-4 w-4" />
          <span>Помощь и поддержка</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
