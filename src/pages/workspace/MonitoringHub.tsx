import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Activity, Shield, TrendingUp } from 'lucide-react';
import AnalyticsTab from './monitoring/AnalyticsTab';
import MetricsTab from './monitoring/MetricsTab';
import SystemTab from './monitoring/SystemTab';
import AdminTab from './monitoring/AdminTab';
import { useUserRole } from '@/hooks/useUserRole';

type MonitoringTab = 'analytics' | 'metrics' | 'system' | 'admin';

const MonitoringHub = () => {
  const [activeTab, setActiveTab] = useState<MonitoringTab>('analytics');
  const { isAdmin } = useUserRole();

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-border/40">
        <h1 className="text-3xl font-bold mb-2">Мониторинг</h1>
        <p className="text-muted-foreground">
          Аналитика, метрики, система и администрирование
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MonitoringTab)} className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'} max-w-2xl`}>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Аналитика</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Метрики</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline">Система</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Админ</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="analytics" className="h-full m-0 p-0">
            <AnalyticsTab />
          </TabsContent>
          <TabsContent value="metrics" className="h-full m-0 p-0">
            <MetricsTab />
          </TabsContent>
          {isAdmin && (
            <>
              <TabsContent value="system" className="h-full m-0 p-0">
                <SystemTab />
              </TabsContent>
              <TabsContent value="admin" className="h-full m-0 p-0">
                <AdminTab />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default MonitoringHub;
