import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Analytics = () => {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Аналитика</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Статистика и аналитика скоро появятся здесь
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
