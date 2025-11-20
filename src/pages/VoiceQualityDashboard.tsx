import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface LanguageMetrics {
  language: string;
  total_responses: number;
  avg_response_length: number;
  avg_clarity_score: number;
  avg_satisfaction_score: number;
  feedback_count: number;
}

interface IntentMetrics {
  intent: string;
  total_responses: number;
  avg_response_length: number;
  cache_hit_rate: number;
}

interface TrendData {
  date: string;
  responses: number;
  clarity: number;
  satisfaction: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  ca: 'Catalan',
  fr: 'French',
  it: 'Italian',
  de: 'German',
};

export default function VoiceQualityDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [languageMetrics, setLanguageMetrics] = useState<LanguageMetrics[]>([]);
  const [intentMetrics, setIntentMetrics] = useState<IntentMetrics[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalResponses: 0,
    avgLength: 0,
    avgClarity: 0,
    avgSatisfaction: 0,
    feedbackRate: 0,
  });
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);

      // Refresh materialized view first
      await supabase.rpc('refresh_voice_quality_stats');

      // Fetch aggregated metrics by language
      const { data: langData, error: langError } = await supabase
        .from('voice_quality_stats')
        .select('*')
        .order('total_responses', { ascending: false });

      if (langError) throw langError;

      // Aggregate by language
      const langMap = new Map<string, LanguageMetrics>();
      langData?.forEach((row: any) => {
        const lang = row.language;
        if (!langMap.has(lang)) {
          langMap.set(lang, {
            language: lang,
            total_responses: 0,
            avg_response_length: 0,
            avg_clarity_score: 0,
            avg_satisfaction_score: 0,
            feedback_count: 0,
          });
        }
        const metrics = langMap.get(lang)!;
        metrics.total_responses += row.total_responses || 0;
        metrics.avg_response_length += (row.avg_response_length || 0) * (row.total_responses || 0);
        metrics.avg_clarity_score += (row.avg_clarity_score || 0) * (row.feedback_count || 0);
        metrics.avg_satisfaction_score += (row.avg_satisfaction_score || 0) * (row.feedback_count || 0);
        metrics.feedback_count += row.feedback_count || 0;
      });

      const langMetrics = Array.from(langMap.values()).map((m) => ({
        ...m,
        avg_response_length: m.total_responses > 0 ? m.avg_response_length / m.total_responses : 0,
        avg_clarity_score: m.feedback_count > 0 ? m.avg_clarity_score / m.feedback_count : 0,
        avg_satisfaction_score: m.feedback_count > 0 ? m.avg_satisfaction_score / m.feedback_count : 0,
      }));

      setLanguageMetrics(langMetrics);

      // Aggregate by intent
      const intentMap = new Map<string, IntentMetrics>();
      langData?.forEach((row: any) => {
        const intent = row.intent;
        if (!intentMap.has(intent)) {
          intentMap.set(intent, {
            intent,
            total_responses: 0,
            avg_response_length: 0,
            cache_hit_rate: 0,
          });
        }
        const metrics = intentMap.get(intent)!;
        metrics.total_responses += row.total_responses || 0;
        metrics.avg_response_length += (row.avg_response_length || 0) * (row.total_responses || 0);
        metrics.cache_hit_rate += (row.cache_hits || 0);
      });

      const intMetrics = Array.from(intentMap.values()).map((m) => ({
        ...m,
        avg_response_length: m.total_responses > 0 ? m.avg_response_length / m.total_responses : 0,
        cache_hit_rate: m.total_responses > 0 ? (m.cache_hit_rate / m.total_responses) * 100 : 0,
      }));

      setIntentMetrics(intMetrics);

      // Calculate trend data (last 30 days)
      const trendMap = new Map<string, TrendData>();
      langData?.forEach((row: any) => {
        const date = new Date(row.date).toLocaleDateString();
        if (!trendMap.has(date)) {
          trendMap.set(date, {
            date,
            responses: 0,
            clarity: 0,
            satisfaction: 0,
          });
        }
        const trend = trendMap.get(date)!;
        trend.responses += row.total_responses || 0;
        const feedbackCount = row.feedback_count || 0;
        if (feedbackCount > 0) {
          trend.clarity += (row.avg_clarity_score || 0) * feedbackCount;
          trend.satisfaction += (row.avg_satisfaction_score || 0) * feedbackCount;
        }
      });

      const trends = Array.from(trendMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30);

      setTrendData(trends);

      // Calculate overall stats
      const totalResponses = langMetrics.reduce((sum, m) => sum + m.total_responses, 0);
      const totalLength = langMetrics.reduce((sum, m) => sum + m.avg_response_length * m.total_responses, 0);
      const totalFeedback = langMetrics.reduce((sum, m) => sum + m.feedback_count, 0);
      const totalClarity = langMetrics.reduce((sum, m) => sum + m.avg_clarity_score * m.feedback_count, 0);
      const totalSatisfaction = langMetrics.reduce((sum, m) => sum + m.avg_satisfaction_score * m.feedback_count, 0);

      setOverallStats({
        totalResponses,
        avgLength: totalResponses > 0 ? totalLength / totalResponses : 0,
        avgClarity: totalFeedback > 0 ? totalClarity / totalFeedback : 0,
        avgSatisfaction: totalFeedback > 0 ? totalSatisfaction / totalFeedback : 0,
        feedbackRate: totalResponses > 0 ? (totalFeedback / totalResponses) * 100 : 0,
      });
    } catch (error) {
      console.error('Error fetching voice quality metrics:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load voice quality metrics',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchMetrics();
    }
  }, [isAdmin]);

  if (adminLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Voice Quality Metrics</h1>
        <p className="text-muted-foreground mb-4">Loading...</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <AlertDescription>You must be an admin to access this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getTrendIcon = (value: number, threshold: number) => {
    if (value > threshold) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < threshold) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Voice Quality Metrics</h1>
          <p className="text-muted-foreground mt-2">Monitor voice assistant response quality and user satisfaction</p>
        </div>
        <Button onClick={fetchMetrics} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalResponses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Length</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{Math.round(overallStats.avgLength)}</div>
              {getTrendIcon(overallStats.avgLength, 100)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">characters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clarity Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{overallStats.avgClarity.toFixed(2)}</div>
              {getTrendIcon(overallStats.avgClarity, 4.0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">out of 5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{overallStats.avgSatisfaction.toFixed(2)}</div>
              {getTrendIcon(overallStats.avgSatisfaction, 4.0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">out of 5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Feedback Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{overallStats.feedbackRate.toFixed(1)}%</div>
              {getTrendIcon(overallStats.feedbackRate, 30)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">responses rated</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="language" className="space-y-4">
        <TabsList>
          <TabsTrigger value="language">By Language</TabsTrigger>
          <TabsTrigger value="intent">By Intent</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="language" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Response Distribution by Language */}
            <Card>
              <CardHeader>
                <CardTitle>Response Distribution</CardTitle>
                <CardDescription>Total responses by language</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={languageMetrics.map((m) => ({
                        name: LANGUAGE_NAMES[m.language] || m.language,
                        value: m.total_responses,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {languageMetrics.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quality Scores by Language */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Scores</CardTitle>
                <CardDescription>Average clarity and satisfaction by language</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={languageMetrics.map((m) => ({
                    language: LANGUAGE_NAMES[m.language] || m.language,
                    clarity: Number(m.avg_clarity_score.toFixed(2)),
                    satisfaction: Number(m.avg_satisfaction_score.toFixed(2)),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="language" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="clarity" fill="#0088FE" name="Clarity" />
                    <Bar dataKey="satisfaction" fill="#00C49F" name="Satisfaction" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Language Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Metrics by Language</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Language</th>
                      <th className="text-right p-2">Responses</th>
                      <th className="text-right p-2">Avg Length</th>
                      <th className="text-right p-2">Clarity</th>
                      <th className="text-right p-2">Satisfaction</th>
                      <th className="text-right p-2">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {languageMetrics.map((m) => (
                      <tr key={m.language} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{LANGUAGE_NAMES[m.language] || m.language}</td>
                        <td className="text-right p-2">{m.total_responses}</td>
                        <td className="text-right p-2">{Math.round(m.avg_response_length)} chars</td>
                        <td className="text-right p-2">{m.avg_clarity_score.toFixed(2)} / 5</td>
                        <td className="text-right p-2">{m.avg_satisfaction_score.toFixed(2)} / 5</td>
                        <td className="text-right p-2">
                          {m.feedback_count} ({m.total_responses > 0 ? ((m.feedback_count / m.total_responses) * 100).toFixed(1) : 0}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intent" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Average Response Length by Intent */}
            <Card>
              <CardHeader>
                <CardTitle>Avg Response Length</CardTitle>
                <CardDescription>Character count by intent type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={intentMetrics.map((m) => ({
                    intent: m.intent,
                    length: Math.round(m.avg_response_length),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="intent" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="length" fill="#8884d8" name="Avg Length (chars)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cache Hit Rate by Intent */}
            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Rate</CardTitle>
                <CardDescription>Percentage of cached responses by intent</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={intentMetrics.map((m) => ({
                    intent: m.intent,
                    cacheRate: Number(m.cache_hit_rate.toFixed(1)),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="intent" angle={-45} textAnchor="end" height={100} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="cacheRate" fill="#00C49F" name="Cache Hit Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Intent Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Intent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Intent</th>
                      <th className="text-right p-2">Total Responses</th>
                      <th className="text-right p-2">Avg Length</th>
                      <th className="text-right p-2">Cache Hit Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intentMetrics
                      .sort((a, b) => b.total_responses - a.total_responses)
                      .map((m) => (
                        <tr key={m.intent} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{m.intent}</td>
                          <td className="text-right p-2">{m.total_responses}</td>
                          <td className="text-right p-2">{Math.round(m.avg_response_length)} chars</td>
                          <td className="text-right p-2">{m.cache_hit_rate.toFixed(1)}%</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Response Volume Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Response Volume Trend</CardTitle>
              <CardDescription>Daily response count over last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="responses" stroke="#8884d8" name="Responses" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quality Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Score Trends</CardTitle>
              <CardDescription>Clarity and satisfaction scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="clarity" stroke="#0088FE" name="Clarity" />
                  <Line type="monotone" dataKey="satisfaction" stroke="#00C49F" name="Satisfaction" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
