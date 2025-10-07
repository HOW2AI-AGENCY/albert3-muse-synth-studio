import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Music, Sparkles, Zap, Headphones, Wand2 } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src={heroBg} 
            alt="Music waves background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        
        <div className="container relative z-10 text-center px-4 py-20">
          <div className="flex justify-center mb-8 animate-float">
            <div className="p-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-primary/30 glow-primary">
              <Music className="w-16 h-16 text-primary animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 text-gradient-primary animate-slide-up leading-tight">
            MusicAI Pro
          </h1>
          
          <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto mb-4 animate-fade-in font-medium" style={{ animationDelay: '0.2s' }}>
            Создавайте профессиональную музыку с помощью AI за минуты
          </p>
          
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Без музыкального образования. Без сложного оборудования. Просто ваше воображение.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20 animate-scale-in" style={{ animationDelay: '0.4s' }}>
            <Button 
              size="xl" 
              variant="hero"
              onClick={() => navigate('/auth')}
            >
              <Sparkles className="mr-2 h-6 w-6" />
              Начать бесплатно
            </Button>
            <Button 
              size="xl" 
              variant="glass"
              onClick={() => navigate('/auth')}
            >
              Войти
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-card/30 backdrop-blur-xl border border-border/30 hover-lift animate-scale-in" style={{ animationDelay: '0.5s' }}>
              <div className="text-4xl md:text-5xl font-black text-gradient-primary mb-2">10K+</div>
              <div className="text-sm md:text-base text-muted-foreground font-medium">Треков создано</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card/30 backdrop-blur-xl border border-border/30 hover-lift animate-scale-in" style={{ animationDelay: '0.6s' }}>
              <div className="text-4xl md:text-5xl font-black text-gradient-secondary mb-2">5K+</div>
              <div className="text-sm md:text-base text-muted-foreground font-medium">Активных пользователей</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-card/30 backdrop-blur-xl border border-border/30 hover-lift animate-scale-in" style={{ animationDelay: '0.7s' }}>
              <div className="text-4xl md:text-5xl font-black text-gradient-primary mb-2">99%</div>
              <div className="text-sm md:text-base text-muted-foreground font-medium">Довольных клиентов</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/30 to-background" />
        
        <div className="container px-4 relative z-10">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl md:text-6xl font-black mb-4 text-gradient-primary">
              Возможности платформы
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Всё, что нужно для создания профессиональной музыки в одном месте
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            <div className="group p-8 rounded-3xl border-2 border-border/50 bg-gradient-to-br from-card/90 to-card/40 backdrop-blur-xl hover:border-primary/50 hover-lift transition-all duration-300 hover:shadow-glow-primary animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform glow-primary">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gradient-primary">Быстрая генерация</h3>
              <p className="text-muted-foreground leading-relaxed">
                Создавайте профессиональные треки за 2-3 минуты с помощью передовых AI моделей
              </p>
            </div>
            
            <div className="group p-8 rounded-3xl border-2 border-border/50 bg-gradient-to-br from-card/90 to-card/40 backdrop-blur-xl hover:border-secondary/50 hover-lift transition-all duration-300 hover:shadow-glow-secondary animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform glow-secondary">
                <Headphones className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gradient-secondary">Любые жанры</h3>
              <p className="text-muted-foreground leading-relaxed">
                Pop, Rock, Electronic, Hip-Hop, Jazz, Classical и десятки других стилей
              </p>
            </div>
            
            <div className="group p-8 rounded-3xl border-2 border-border/50 bg-gradient-to-br from-card/90 to-card/40 backdrop-blur-xl hover:border-accent/50 hover-lift transition-all duration-300 hover:shadow-glow-accent animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform glow-accent">
                <Wand2 className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gradient-primary">AI ассистент</h3>
              <p className="text-muted-foreground leading-relaxed">
                Генерация текстов песен, улучшение промптов и подбор стилей с помощью AI
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        
        <div className="container px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto p-12 rounded-3xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-2xl border border-border/30 animate-scale-in">
            <h2 className="text-4xl md:text-6xl font-black mb-6 text-gradient-primary">
              Готовы создать свою первую композицию?
            </h2>
            <p className="text-lg md:text-xl text-foreground/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              Присоединяйтесь к тысячам музыкантов, которые уже используют MusicAI Pro для создания невероятной музыки
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="xl" 
                variant="hero"
                onClick={() => navigate('/auth')}
              >
                <Sparkles className="mr-2 h-6 w-6" />
                Начать бесплатно
              </Button>
              <Button 
                size="xl" 
                variant="glass"
                onClick={() => navigate('/auth')}
              >
                <Music className="mr-2 h-6 w-6" />
                Узнать больше
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
