import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface RealTimeMetrics {
  totalRequests: number;
  cacheHitRate: number;
  avgGenerationTime: number;
  errorRate: number;
  totalCost: number;
  requestsByProvider: { provider: string; count: number }[];
  hourlyCalls: { hour: string; elevenlabs: number; openai: number }[];
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

interface AlertThreshold {
  id: string;
  metric_name: string;
  threshold_value: number;
  time_window_minutes: number;
  enabled: boolean;
  alert_severity: string;
  description: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const SEVERITY_COLORS = {
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
};

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
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<AlertThreshold | null>(null);
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);

      // Fetch logs from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: logs, error: logsError } = await supabase
        .from('tts_monitoring_logs')
        .select('*')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Calculate real-time metrics
      const total = logs?.length || 0;
      const cached = logs?.filter(l => l.cached).length || 0;
      const errors = logs?.filter(l => l.status === 'error').length || 0;
      const totalGenTime = logs?.reduce((sum, l) => sum + (l.generation_time_ms || 0), 0) || 0;
      const totalCost = logs?.reduce((sum, l) => sum + Number(l.estimated_cost || 0), 0) || 0;

      // Group by provider
      const providerMap = new Map<string, number>();
      logs?.forEach(log => {
        providerMap.set(log.provider, (providerMap.get(log.provider) || 0) + 1);
      });

      const requestsByProvider = Array.from(providerMap.entries()).map(([provider, count]) => ({
        provider,
        count,
      }));

      // Group by hour
      const hourlyMap = new Map<string, { elevenlabs: number; openai: number }>();
      logs?.forEach(log => {
        const hour = new Date(log.created_at).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          hour12: false 
        });
        if (!hourlyMap.has(hour)) {
          hourlyMap.set(hour, { elevenlabs: 0, openai: 0 });
        }
        const entry = hourlyMap.get(hour)!;
        if (log.provider === 'ElevenLabs') entry.elevenlabs++;
        if (log.provider === 'OpenAI') entry.openai++;
      });

      const hourlyCalls = Array.from(hourlyMap.entries())
        .map(([hour, counts]) => ({ hour, ...counts }))
        .sort((a, b) => a.hour.localeCompare(b.hour))
        .slice(-24);

      setMetrics({
        totalRequests: total,
        cacheHitRate: total > 0 ? (cached / total) * 100 : 0,
        avgGenerationTime: total > 0 ? totalGenTime / total : 0,
        errorRate: total > 0 ? (errors / total) * 100 : 0,
        totalCost,
        requestsByProvider,
        hourlyCalls,
      });

      // Fetch active alerts (not acknowledged)
      const { data: alerts, error: alertsError } = await supabase
        .from('tts_alerts_log')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (alertsError) throw alertsError;
      setActiveAlerts(alerts || []);

      // Fetch alert thresholds
      const { data: thresholdsData, error: thresholdsError } = await supabase
        .from('tts_alert_thresholds')
        .select('*')
        .order('metric_name');

      if (thresholdsError) throw thresholdsError;
      setThresholds(thresholdsData || []);

    } catch (error) {
      console.error('Error fetching TTS monitoring data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load monitoring data',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkAlerts = async () => {
    try {
      setCheckingAlerts(true);
      
      const { data, error } = await supabase.functions.invoke('check-tts-alerts');

      if (error) throw error;

      toast({
        title: 'Alerts Checked',
        description: `${data.triggered} alert(s) triggered out of ${data.checked} checked`,
      });

      // Refresh to show new alerts
      await fetchMetrics();
    } catch (error) {
      console.error('Error checking alerts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to check alerts',
      });
    } finally {
      setCheckingAlerts(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('tts_alerts_log')
        .update({
          acknowledged: true,
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert Acknowledged',
        description: 'Alert has been marked as resolved',
      });

      await fetchMetrics();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to acknowledge alert',
      });
    }
  };

  const updateThreshold = async (threshold: AlertThreshold) => {
    try {
      const { error } = await supabase
        .from('tts_alert_thresholds')
        .update({
          threshold_value: threshold.threshold_value,
          time_window_minutes: threshold.time_window_minutes,
          enabled: threshold.enabled,
        })
        .eq('id', threshold.id);

      if (error) throw error;

      toast({
        title: 'Threshold Updated',
        description: `${threshold.metric_name} threshold updated successfully`,
      });

      setEditingThreshold(null);
      await fetchMetrics();
    } catch (error) {
      console.error('Error updating threshold:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update threshold',
      });
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchMetrics();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  if (adminLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">TTS Real-Time Monitor</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
    };
    return variants[severity] || 'default';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">TTS Real-Time Monitor</h1>
          <p className="text-muted-foreground mt-1">Live monitoring and alerting for TTS usage</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={checkAlerts} disabled={checkingAlerts} variant="outline" size="sm">
            <AlertTriangle className={`h-4 w-4 mr-2 ${checkingAlerts ? 'animate-pulse' : ''}`} />
            Check Alerts
          </Button>
          <Button onClick={fetchMetrics} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Active Alerts ({activeAlerts.length})
          </h2>
          {activeAlerts.map((alert) => (
            <Alert
              key={alert.id}
              className={SEVERITY_COLORS[alert.alert_severity as keyof typeof SEVERITY_COLORS]}
            >
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => acknowledgeAlert(alert.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Acknowledge
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Real-Time Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cache Hit Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metrics.cacheHitRate.toFixed(1)}%</div>
              {metrics.cacheHitRate >= 30 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target: &gt;30%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Gen Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{Math.round(metrics.avgGenerationTime)}ms</div>
              {metrics.avgGenerationTime <= 2000 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target: &lt;2000ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</div>
              {metrics.errorRate <= 5 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target: &lt;5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">${metrics.totalCost.toFixed(2)}</div>
              {metrics.totalCost <= 50 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Budget: $50/day</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">Live Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alert Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Requests by Provider */}
            <Card>
              <CardHeader>
                <CardTitle>Requests by Provider</CardTitle>
                <CardDescription>Last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={metrics.requestsByProvider}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ provider, count }) => `${provider}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.requestsByProvider.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Hourly Call Volume */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Call Volume</CardTitle>
                <CardDescription>Last 24 hours by provider</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={metrics.hourlyCalls}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="elevenlabs" stackId="1" stroke="#0088FE" fill="#0088FE" name="ElevenLabs" />
                    <Area type="monotone" dataKey="openai" stackId="1" stroke="#00C49F" fill="#00C49F" name="OpenAI" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Thresholds Configuration</CardTitle>
              <CardDescription>Configure when to trigger alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {thresholds.map((threshold) => (
                  <div
                    key={threshold.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{threshold.metric_name}</h3>
                        <Badge variant={getSeverityBadge(threshold.alert_severity)}>
                          {threshold.alert_severity}
                        </Badge>
                        {!threshold.enabled && (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{threshold.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Threshold: {threshold.threshold_value}</span>
                        <span>Window: {threshold.time_window_minutes}min</span>
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingThreshold(threshold)}
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Alert Threshold</DialogTitle>
                          <DialogDescription>{threshold.metric_name}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="threshold">Threshold Value</Label>
                            <Input
                              id="threshold"
                              type="number"
                              value={editingThreshold?.threshold_value || threshold.threshold_value}
                              onChange={(e) =>
                                setEditingThreshold({
                                  ...threshold,
                                  threshold_value: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="window">Time Window (minutes)</Label>
                            <Input
                              id="window"
                              type="number"
                              value={editingThreshold?.time_window_minutes || threshold.time_window_minutes}
                              onChange={(e) =>
                                setEditingThreshold({
                                  ...threshold,
                                  time_window_minutes: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="enabled"
                              checked={editingThreshold?.enabled ?? threshold.enabled}
                              onCheckedChange={(checked) =>
                                setEditingThreshold({
                                  ...threshold,
                                  enabled: checked,
                                })
                              }
                            />
                            <Label htmlFor="enabled">Enabled</Label>
                          </div>
                          <Button
                            onClick={() => updateThreshold(editingThreshold || threshold)}
                            className="w-full"
                          >
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
