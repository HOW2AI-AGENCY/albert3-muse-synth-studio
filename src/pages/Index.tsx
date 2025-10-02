import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MusicGenerator } from "@/components/MusicGenerator";
import { TracksList } from "@/components/TracksList";
import { AuthForm } from "@/components/AuthForm";
import heroBackground from "@/assets/hero-bg.jpg";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [refreshTracks, setRefreshTracks] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setShowAuth(!session?.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setShowAuth(!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTrackGenerated = () => {
    setRefreshTracks((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header user={user} onAuthClick={() => setShowAuth(true)} />

      {/* Hero Section */}
      <section
        className="relative pt-32 pb-20 px-4 overflow-hidden"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
        
        <div className="relative container mx-auto max-w-6xl">
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-gradient-primary animate-fade-in">
              AI Music Studio
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Create professional music tracks with the power of artificial intelligence.
              Describe your vision, and watch it come to life.
            </p>
          </div>

          {!user ? (
            <div className="max-w-md mx-auto animate-fade-in">
              <AuthForm />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto animate-fade-in">
              <MusicGenerator onTrackGenerated={handleTrackGenerated} />
            </div>
          )}
        </div>
      </section>

      {/* Tracks Section */}
      {user && (
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <TracksList refreshTrigger={refreshTracks} />
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
