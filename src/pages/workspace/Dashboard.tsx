import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Library, Settings, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">
            Добро пожаловать в MusicAI Pro! 🎵
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Начните создавать музыку с помощью искусственного интеллекта
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Всего треков</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">0</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">В процессе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">0</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Завершено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">0</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Публичных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/workspace/generate")}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Создать трек</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Сгенерируйте новую композицию с помощью AI
            </p>
            <Button className="w-full mt-4">
              Перейти
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/workspace/library")}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Library className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Библиотека</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Просмотрите все ваши треки
            </p>
            <Button variant="outline" className="w-full mt-4">
              Перейти
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/workspace/settings")}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Настройки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Управляйте вашим аккаунтом
            </p>
            <Button variant="outline" className="w-full mt-4">
              Перейти
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
