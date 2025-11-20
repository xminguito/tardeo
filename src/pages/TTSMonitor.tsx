import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, Shield, Power, DollarSign, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RealTimeMetrics {
  totalRequests: number;
  cacheHitRate: number;
  avgGenerationTime: number;
  errorRate: number;
  totalCost: number;
  requestsByProvider: { provider: string; count: number }[];
  hourlyCalls: { hour: string; elevenlabs: number; openai: number }[];
}

interface SystemFlag {
  id: string;
  flag_key: string;
  flag_value: any;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface TTSConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string | null;
}

interface ActiveAlert {
  id: string;
  metric_name: string;
  metric_value: number;
  threshold_value: number;
  alert_severity: string;
  alert_message: string;
  created_at: string;
  acknowledged: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function TTSMonitor() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    totalRequests: 0,
    cacheHitRate: 0,
    avgGenerationTime: 0,
    errorRate: 0,
    totalCost: 0,
    requestsByProvider: [],
    hourlyCalls: [],
  });
  const [systemFlags, setSystemFlags] = useState<SystemFlag[]>([]);
  const [ttsConfig, setTTSConfig] = useState<TTSConfig[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  
  // Manual override state
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideProvider, setOverrideProvider] = useState<string>('openai');
  const [overrideVoice, setOverrideVoice] = useState('shimmer');
  const [overrideBitrate, setOverrideBitrate] = useState('64');
  
  // Config edit state
  const [dailyCap, setDailyCap] = useState('50');
  const [dailyCapEnabled, setDailyCapEnabled] = useState(true);
  const [perMinuteLimit, setPerMinuteLimit] = useState('10');
  const [perDayLimit, setPerDayLimit] = useState('50');

  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  useEffect(() => {
    if (isAdmin) {
      fetchAll();
    }
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchMetrics(),
      fetchSystemFlags(),
      fetchTTSConfig(),
      fetchActiveAlerts(),
    ]);
    setLoading(false);
  };

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: logs, error } = await supabase
        .from('tts_monitoring_logs')
        .select('*')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = logs?.length || 0;
      const cached = logs?.filter(l => l.cached).length || 0;
      const errors = logs?.filter(l => l.status === 'error').length || 0;
      const totalGenTime = logs?.reduce((sum, l) => sum + (l.generation_time_ms || 0), 0) || 0;
      const totalCost = logs?.reduce((sum, l) => sum + Number(l.estimated_cost || 0), 0) || 0;

      const providerCounts = logs?.reduce((acc: any, log) => {
        acc[log.provider] = (acc[log.provider] || 0) + 1;
        return acc;
      }, {});

      const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
      const hourlyData = logs
        ?.filter(l => new Date(l.created_at).getTime() > twelveHoursAgo)
        .reduce((acc: any, log) => {
          const hour = new Date(log.created_at).getHours();
          const key = `${hour}:00`;
          if (!acc[key]) acc[key] = { hour: key, elevenlabs: 0, openai: 0 };
          if (log.provider === 'ElevenLabs') acc[key].elevenlabs++;
          if (log.provider === 'OpenAI') acc[key].openai++;
          return acc;
        }, {});

      setMetrics({
        totalRequests: total,
        cacheHitRate: total > 0 ? (cached / total) * 100 : 0,
        avgGenerationTime: total > 0 ? totalGenTime / total : 0,
        errorRate: total > 0 ? (errors / total) * 100 : 0,
        totalCost,
        requestsByProvider: Object.entries(providerCounts || {}).map(([provider, count]) => ({ provider, count: count as number })),
        hourlyCalls: Object.values(hourlyData || {}),
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSystemFlags = async () => {
    const { data, error } = await supabase
      .from('system_flags')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching system flags:', error);
    } else {
      setSystemFlags(data || []);
    }
  };

  const fetchTTSConfig = async () => {
    const { data, error } = await supabase
      .from('tts_config')
      .select('*');

    if (error) {
      console.error('Error fetching TTS config:', error);
    } else {
      setTTSConfig(data || []);
      
      const capConfig = data?.find(c => c.config_key === 'daily_hard_cap_usd');
      if (capConfig && capConfig.config_value && typeof capConfig.config_value === 'object') {
        const value = capConfig.config_value as Record<string, any>;
        setDailyCap(String(value['value'] || 50));
        setDailyCapEnabled(value['enabled'] ?? true);
      }
      
      const limitsConfig = data?.find(c => c.config_key === 'per_user_limits');
      if (limitsConfig && limitsConfig.config_value && typeof limitsConfig.config_value === 'object') {
        const value = limitsConfig.config_value as Record<string, any>;
        setPerMinuteLimit(String(value['requests_per_minute'] || 10));
        setPerDayLimit(String(value['requests_per_day'] || 50));
      }
    }
  };

  const fetchActiveAlerts = async () => {
    const { data, error } = await supabase
      .from('tts_alerts_log')
      .select('*')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching alerts:', error);
    } else {
      setActiveAlerts(data || []);
    }
  };

  const checkAlerts = async () => {
    setCheckingAlerts(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-tts-budget');
      
      if (error) throw error;

      toast({
        title: 'Alerts Checked',
        description: `Found ${data.breached_thresholds} breached threshold(s)`,
      });

      await fetchAll();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCheckingAlerts(false);
    }
  };

  const clearFlag = async (flagKey: string) => {
    try {
      const { error } = await supabase
        .from('system_flags')
        .delete()
        .eq('flag_key', flagKey);

      if (error) throw error;

      toast({
        title: 'Flag Cleared',
        description: `${flagKey} has been removed`,
      });

      await fetchSystemFlags();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const setManualOverride = async () => {
    try {
      const { error } = await supabase
        .from('system_flags')
        .upsert({
          flag_key: 'tts_manual_override',
          flag_value: {
            enabled: true,
            provider: overrideProvider,
            voice: overrideVoice,
            bitrate: parseInt(overrideBitrate),
            set_at: new Date().toISOString(),
          },
          description: 'Manual TTS provider override by administrator',
        }, {
          onConflict: 'flag_key',
        });

      if (error) throw error;

      toast({
        title: 'Manual Override Set',
        description: `TTS will now use ${overrideProvider}`,
      });

      setOverrideOpen(false);
      await fetchSystemFlags();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateTTSConfig = async () => {
    try {
      const updates = [
        {
          config_key: 'daily_hard_cap_usd',
          config_value: { value: parseFloat(dailyCap), enabled: dailyCapEnabled },
        },
        {
          config_key: 'per_user_limits',
          config_value: {
            requests_per_minute: parseInt(perMinuteLimit),
            requests_per_day: parseInt(perDayLimit),
          },
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('tts_config')
          .update({ config_value: update.config_value })
          .eq('config_key', update.config_key);

        if (error) throw error;
      }

      toast({
        title: 'Configuration Updated',
        description: 'TTS limits have been updated',
      });

      await fetchTTSConfig();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('tts_alerts_log')
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert Acknowledged',
      });

      await fetchActiveAlerts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>Admin access required</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      info: 'default',
      warning: 'secondary',
      critical: 'destructive',
      error: 'destructive',
    };
    return variants[severity] || 'default';
  };

  const isSystemDisabled = systemFlags.some(
    f => (f.flag_key === 'tts_hard_cap_reached' || f.flag_key === 'tts_eleven_disabled') && f.flag_value?.disabled
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">TTS Real-Time Monitor</h1>
          <p className="text-muted-foreground mt-1">Live monitoring, circuit breakers & cost control</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Power className="h-4 w-4 mr-2" />
                Manual Override
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manual TTS Override</DialogTitle>
                <DialogDescription>
                  Force a specific TTS provider configuration (bypasses circuit breakers)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Provider</Label>
                  <Select value={overrideProvider} onValueChange={setOverrideProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Voice</Label>
                  <Input
                    value={overrideVoice}
                    onChange={(e) => setOverrideVoice(e.target.value)}
                    placeholder="shimmer"
                  />
                </div>
                <div>
                  <Label>Bitrate (kbps)</Label>
                  <Input
                    type="number"
                    value={overrideBitrate}
                    onChange={(e) => setOverrideBitrate(e.target.value)}
                  />
                </div>
                <Button onClick={setManualOverride} className="w-full">
                  Activate Override
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={checkAlerts} disabled={checkingAlerts} variant="outline" size="sm">
            <AlertTriangle className={`h-4 w-4 mr-2 ${checkingAlerts ? 'animate-pulse' : ''}`} />
            Check Alerts
          </Button>
          <Button onClick={fetchAll} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isSystemDisabled && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Circuit Breaker Active</AlertTitle>
          <AlertDescription>
            TTS service is currently restricted due to cost controls. Check System Flags tab for details.
          </AlertDescription>
        </Alert>
      )}

      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Active Alerts ({activeAlerts.length})
          </h2>
          {activeAlerts.map((alert) => (
            <Alert key={alert.id} variant="destructive">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AlertTitle className="flex items-center gap-2">
                    <Badge variant={getSeverityBadge(alert.alert_severity)}>
                      {alert.alert_severity.toUpperCase()}
                    </Badge>
                    {alert.metric_name}
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    {alert.alert_message}
                    <div className="text-xs mt-1 opacity-70">
                      Triggered: {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </AlertDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert.id)}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Acknowledge
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Generation Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgGenerationTime.toFixed(0)}ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="flags">System Flags</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requests by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.requestsByProvider.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={metrics.requestsByProvider}
                        dataKey="count"
                        nameKey="provider"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {metrics.requestsByProvider.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hourly Calls (Last 12h)</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics.hourlyCalls.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.hourlyCalls}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="elevenlabs" fill="#0088FE" name="ElevenLabs" />
                      <Bar dataKey="openai" fill="#00C49F" name="OpenAI" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Flags & Circuit Breakers
              </CardTitle>
              <CardDescription>
                Active system flags control TTS behavior and implement circuit breakers for cost control
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemFlags.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No active flags - system operating normally</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {systemFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className="border rounded-lg p-4 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={flag.flag_value?.disabled ? 'destructive' : 'default'}>
                            {flag.flag_key}
                          </Badge>
                          {flag.flag_value?.manual_override && (
                            <Badge variant="secondary">Manual Override</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                        {flag.flag_value?.reason && (
                          <p className="text-sm mt-2">
                            <strong>Reason:</strong> {flag.flag_value.reason}
                          </p>
                        )}
                        {flag.flag_value?.triggered_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Triggered: {new Date(flag.flag_value.triggered_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => clearFlag(flag.flag_key)}
                      >
                        Clear Flag
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Daily Cost Cap
                </CardTitle>
                <CardDescription>
                  Hard limit on daily TTS costs - service disabled when reached
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={dailyCapEnabled}
                    onCheckedChange={setDailyCapEnabled}
                    id="daily-cap-enabled"
                  />
                  <Label htmlFor="daily-cap-enabled">Enable hard daily cap</Label>
                </div>
                <div>
                  <Label>Daily cap (USD)</Label>
                  <Input
                    type="number"
                    value={dailyCap}
                    onChange={(e) => setDailyCap(e.target.value)}
                    disabled={!dailyCapEnabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Current 24h cost: ${metrics.totalCost.toFixed(2)}
                  </p>
                </div>
                <Button onClick={updateTTSConfig} className="w-full">
                  Update Configuration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Per-User Limits
                </CardTitle>
                <CardDescription>
                  Rate limits to prevent individual user abuse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Requests per minute</Label>
                  <Input
                    type="number"
                    value={perMinuteLimit}
                    onChange={(e) => setPerMinuteLimit(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Requests per day</Label>
                  <Input
                    type="number"
                    value={perDayLimit}
                    onChange={(e) => setPerDayLimit(e.target.value)}
                  />
                </div>
                <Button onClick={updateTTSConfig} className="w-full">
                  Update Limits
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
