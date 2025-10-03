import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Music, Sparkles, Zap } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        
        <div className="container relative z-10 text-center px-4">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-primary/10 backdrop-blur-sm">
              <Music className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 gradient-text">
            MusicAI Pro
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Создавайте профессиональную музыку с помощью AI за минуты. Без музыкального образования. Без сложного оборудования.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg"
              onClick={() => navigate('/auth')}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Начать бесплатно
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-8 text-lg"
              onClick={() => navigate('/auth')}
            >
              Войти
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto mt-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground mt-1">Треков создано</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">5K+</div>
              <div className="text-sm text-muted-foreground mt-1">Пользователей</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">99%</div>
              <div className="text-sm text-muted-foreground mt-1">Довольных</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-12">
            Возможности платформы
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Быстрая генерация</h3>
              <p className="text-muted-foreground">
                Создавайте профессиональные треки за 2-3 минуты с помощью AI
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Music className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Любые жанры</h3>
              <p className="text-muted-foreground">
                Pop, Rock, Electronic, Hip-Hop и многое другое
              </p>
            </div>
            
            <div className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI тексты</h3>
              <p className="text-muted-foreground">
                Генерация текстов песен на русском и английском языках
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Готовы создать свою первую композицию?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к тысячам музыкантов, которые уже используют MusicAI Pro
          </p>
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg"
            onClick={() => navigate('/auth')}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Начать бесплатно
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
