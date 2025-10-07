import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Music, Clock, Heart, Eye } from "lucide-react";

const Analytics = () => {
  const statsData = [
    { 
      title: "Всего треков", 
      value: "0", 
      icon: Music, 
      gradient: "from-purple-500 to-pink-500",
      change: "+0%"
    },
    { 
      title: "Время прослушивания", 
      value: "0 мин", 
      icon: Clock, 
      gradient: "from-blue-500 to-cyan-500",
      change: "+0%"
    },
    { 
      title: "Всего лайков", 
      value: "0", 
      icon: Heart, 
      gradient: "from-red-500 to-pink-500",
      change: "+0%"
    },
    { 
      title: "Просмотры", 
      value: "0", 
      icon: Eye, 
      gradient: "from-green-500 to-emerald-500",
      change: "+0%"
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Заголовок */}
      <div className="flex items-center gap-3 animate-slide-up">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gradient-primary">
            Аналитика
          </h1>
          <p className="text-muted-foreground mt-1">
            Отслеживайте статистику ваших треков
          </p>
        </div>
      </div>

      {/* Статистические карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title}
              variant="modern"
              className="group hover-lift animate-scale-in overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                    {stat.change}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-3xl font-black text-gradient-primary">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Главная аналитическая карточка */}
      <Card variant="glass" className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-gradient-primary">Детальная аналитика</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16">
            <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 mb-6 animate-float">
              <BarChart3 className="h-16 w-16 text-primary/60" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-gradient-secondary">
              Скоро появится
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Мы работаем над детальной аналитикой ваших треков. Скоро вы сможете просматривать графики прослушиваний, популярность треков и многое другое.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
