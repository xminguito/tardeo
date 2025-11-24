import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  DollarSign, Activity, AlertTriangle, TrendingUp, 
  Zap, Database, Clock, ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';

const COLORS = {
  elevenlabs: '#8b5cf6',
  openai: '#10b981',
  primary: 'hsl(var(--primary))',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

interface MetricCard {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

export default function TTSAnalytics() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck(true);

  const [costData, setCostData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [providerStats, setProviderStats] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [systemFlags, setSystemFlags] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);



  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
      setupRealtime();
    }
  }, [isAdmin, refreshKey]);



  const setupRealtime = () => {
    const channel = supabase
      .channel('tts-analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tts_monitoring_logs'
        },
        () => {
          console.log('TTS logs updated, refreshing dashboard...');
          setTimeout(() => setRefreshKey(prev => prev + 1), 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_flags'
        },
        () => {
          console.log('System flags updated, refreshing...');
          loadSystemFlags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadDashboardData = async () => {
    await Promise.all([
      loadCostData(),
      loadPerformanceData(),
      loadProviderStats(),
      loadCacheStats(),
      loadSystemFlags(),
      loadRecentAlerts(),
      loadMetricsSummary(),
    ]);
  };

  const loadCostData = async () => {
    const { data } = await supabase
      .from('tts_monitoring_logs')
      .select('created_at, estimated_cost, actual_cost, provider')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });

    if (data) {
      const grouped = data.reduce((acc: any, log: any) => {
        const date = new Date(log.created_at).toLocaleDateString('es-ES', { 
          month: 'short', 
          day: 'numeric' 
        });
        if (!acc[date]) {
          acc[date] = { date, elevenlabs: 0, openai: 0, total: 0 };
        }
        const cost = log.actual_cost || log.estimated_cost || 0;
        acc[date][log.provider.toLowerCase()] += cost;
        acc[date].total += cost;
        return acc;
      }, {});

      setCostData(Object.values(grouped));
    }
  };

  const loadPerformanceData = async () => {
    const { data } = await supabase
      .from('tts_monitoring_logs')
      .select('created_at, generation_time_ms, provider, text_length')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .not('generation_time_ms', 'is', null)
      .order('created_at', { ascending: true });

    if (data) {
      const grouped = data.reduce((acc: any, log: any) => {
        const hour = new Date(log.created_at).getHours();
        const key = `${hour}:00`;
        if (!acc[key]) {
          acc[key] = { hour: key, count: 0, totalTime: 0, avgTime: 0 };
        }
        acc[key].count += 1;
        acc[key].totalTime += log.generation_time_ms;
        acc[key].avgTime = Math.round(acc[key].totalTime / acc[key].count);
        return acc;
      }, {});

      setPerformanceData(Object.values(grouped));
    }
  };

  const loadProviderStats = async () => {
    const { data } = await supabase
      .from('tts_monitoring_logs')
      .select('provider')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (data) {
      const stats = data.reduce((acc: any, log: any) => {
        const provider = log.provider;
        acc[provider] = (acc[provider] || 0) + 1;
        return acc;
      }, {});

      setProviderStats(
        Object.entries(stats).map(([name, value]) => ({ name, value }))
      );
    }
  };

  const loadCacheStats = async () => {
    const { data } = await supabase
      .from('tts_monitoring_logs')
      .select('cached, cache_hit_saved_cost')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (data) {
      const hits = data.filter(d => d.cached).length;
      const total = data.length;
      const savings = data.reduce((sum, d) => sum + (d.cache_hit_saved_cost || 0), 0);
      
      setCacheStats({
        hitRate: total > 0 ? ((hits / total) * 100).toFixed(1) : '0',
        totalSavings: savings.toFixed(2),
        hits,
        misses: total - hits,
      });
    }
  };

  const loadSystemFlags = async () => {
    const { data } = await supabase
      .from('system_flags')
      .select('*')
      .in('flag_key', ['tts_eleven_disabled', 'tts_hard_cap_reached', 'tts_manual_override']);

    if (data) {
      setSystemFlags(data);
    }
  };

  const loadRecentAlerts = async () => {
    const { data } = await supabase
      .from('tts_alerts_log')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      setAlerts(data);
    }
  };

  const loadMetricsSummary = async () => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // Current period
    const { data: current } = await supabase
      .from('tts_monitoring_logs')
      .select('estimated_cost, actual_cost, generation_time_ms, cached, status')
      .gte('created_at', last24h);

    // Previous period (for comparison)
    const { data: previous } = await supabase
      .from('tts_monitoring_logs')
      .select('estimated_cost, actual_cost')
      .gte('created_at', last48h)
      .lt('created_at', last24h);

    if (current) {
      const currentCost = current.reduce((sum, log) => 
        sum + (log.actual_cost || log.estimated_cost || 0), 0
      );
      const previousCost = previous?.reduce((sum, log) => 
        sum + (log.actual_cost || log.estimated_cost || 0), 0
      ) || 0;
      
      const avgTime = current
        .filter(l => l.generation_time_ms)
        .reduce((sum, l) => sum + l.generation_time_ms, 0) / 
        current.filter(l => l.generation_time_ms).length || 0;
      
      const cacheHits = current.filter(l => l.cached).length;
      const errors = current.filter(l => l.status === 'error').length;
      
      const costChange = previousCost > 0 
        ? (((currentCost - previousCost) / previousCost) * 100).toFixed(1)
        : '0';

      setMetrics([
        {
          title: 'Costo 24h',
          value: `$${currentCost.toFixed(2)}`,
          change: `${costChange}%`,
          trend: parseFloat(costChange) > 0 ? 'up' : 'down',
          icon: <DollarSign className="h-5 w-5" />,
        },
        {
          title: 'Requests',
          value: current.length.toString(),
          icon: <Activity className="h-5 w-5" />,
        },
        {
          title: 'Tiempo Promedio',
          value: `${Math.round(avgTime)}ms`,
          icon: <Clock className="h-5 w-5" />,
        },
        {
          title: 'Cache Hit Rate',
          value: `${((cacheHits / current.length) * 100).toFixed(1)}%`,
          icon: <Database className="h-5 w-5" />,
        },
        {
          title: 'Error Rate',
          value: `${((errors / current.length) * 100).toFixed(1)}%`,
          trend: errors > 0 ? 'up' : 'neutral',
          icon: <AlertTriangle className="h-5 w-5" />,
        },
      ]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const getStatusBadge = (flag: any) => {
    if (flag.flag_value?.disabled || flag.flag_value?.enabled) {
      return (
        <Badge variant="destructive" className="ml-2">
          🔴 Activo
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="ml-2">
        ⚪ Inactivo
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <PageHeader
              title="TTS Analytics Dashboard"
              icon={<TrendingUp className="h-8 w-8 text-primary" />}
              breadcrumbs={[
                { label: 'Admin', href: '/admin' },
                { label: 'TTS Analytics' }
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {metrics.map((metric, idx) => (
              <Card key={idx}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <div className="text-muted-foreground">{metric.icon}</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.change && (
                    <p className={`text-xs ${
                      metric.trend === 'up' ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {metric.trend === 'up' ? '↑' : '↓'} {metric.change} vs ayer
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="costs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="costs">
                <DollarSign className="mr-2 h-4 w-4" />
                Costos
              </TabsTrigger>
              <TabsTrigger value="performance">
                <Zap className="mr-2 h-4 w-4" />
                Rendimiento
              </TabsTrigger>
              <TabsTrigger value="alerts">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Alertas
              </TabsTrigger>
            </TabsList>

            {/* Costs Tab */}
            <TabsContent value="costs" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Costo por Día (Últimos 7 días)</CardTitle>
                    <CardDescription>Distribución de costos por provider</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={costData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => `$${value.toFixed(4)}`}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="elevenlabs" 
                          stackId="1"
                          stroke={COLORS.elevenlabs} 
                          fill={COLORS.elevenlabs}
                          name="ElevenLabs"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="openai" 
                          stackId="1"
                          stroke={COLORS.openai} 
                          fill={COLORS.openai}
                          name="OpenAI"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribución por Provider (24h)</CardTitle>
                    <CardDescription>Requests por proveedor TTS</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={providerStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {providerStats.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'ElevenLabs' ? COLORS.elevenlabs : COLORS.openai} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {cacheStats && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Estadísticas de Caché</CardTitle>
                      <CardDescription>Efectividad del caché TTS (24h)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Cache Hit Rate</span>
                            <span className="text-sm font-bold text-green-600">
                              {cacheStats.hitRate}%
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${cacheStats.hitRate}%` }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Cache Hits</p>
                            <p className="text-2xl font-bold text-green-600">{cacheStats.hits}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Cache Misses</p>
                            <p className="text-2xl font-bold text-orange-600">{cacheStats.misses}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Ahorro Total</p>
                            <p className="text-2xl font-bold text-primary">
                              ${cacheStats.totalSavings}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tiempo de Generación por Hora</CardTitle>
                  <CardDescription>Rendimiento promedio del sistema TTS (últimas 24h)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value: any) => `${value}ms`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="avgTime" 
                        stroke={COLORS.primary} 
                        strokeWidth={2}
                        name="Tiempo Promedio"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Requests por Hora</CardTitle>
                    <CardDescription>Volumen de requests TTS</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill={COLORS.primary} name="Requests" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Circuit Breakers Activos</CardTitle>
                    <CardDescription>Estado de los system flags</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {systemFlags.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No hay flags configurados
                        </p>
                      ) : (
                        systemFlags.map((flag) => (
                          <div 
                            key={flag.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{flag.flag_key}</p>
                              <p className="text-xs text-muted-foreground">
                                {flag.description || flag.flag_value?.reason}
                              </p>
                            </div>
                            {getStatusBadge(flag)}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Alertas Recientes</CardTitle>
                    <CardDescription>Últimas 5 alertas (24h)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {alerts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          ✅ No hay alertas recientes
                        </p>
                      ) : (
                        alerts.map((alert) => (
                          <div 
                            key={alert.id}
                            className="p-3 border rounded-lg space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <Badge variant={
                                alert.alert_severity === 'critical' ? 'destructive' : 
                                alert.alert_severity === 'warning' ? 'default' : 
                                'secondary'
                              }>
                                {alert.alert_severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(alert.created_at).toLocaleString('es-ES')}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{alert.metric_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {alert.alert_message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                  <CardDescription>Gestión del sistema TTS</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/admin/tts-monitor')}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Monitor en Tiempo Real
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/admin/tts-alerts')}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Configurar Alertas
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setRefreshKey(prev => prev + 1)}
                  >
                    Actualizar Datos
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </div>
  );
}
