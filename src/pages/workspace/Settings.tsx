import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Настройки аккаунта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Аккаунт</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Управление вашим аккаунтом и профилем
            </p>
            <Button variant="destructive" onClick={handleSignOut}>
              Выйти из аккаунта
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
