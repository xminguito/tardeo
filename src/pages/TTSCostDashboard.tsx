import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';
import {
  estimateCosts,
  analyzeHistoricalCosts,
  generateUsageProfile,
  compareScenarios,
  formatCurrency,
  type UsageProfile,
  type CostEstimate,
} from '@/lib/tts/costEstimator';
import { useToast } from '@/hooks/use-toast';

export default function TTSCostDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UsageProfile | null>(null);
  const [currentEstimate, setCurrentEstimate] = useState<CostEstimate | null>(null);
  const [historicalAnalysis, setHistoricalAnalysis] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [monthlyUsers, setMonthlyUsers] = useState(1000);



  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);



  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Analyze historical costs
      const analysis = await analyzeHistoricalCosts(startOfMonth, endOfMonth);
      setHistoricalAnalysis(analysis);

      // Generate usage profile from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const generatedProfile = await generateUsageProfile(thirtyDaysAgo, now);
      setProfile(generatedProfile);

      // Calculate estimates
      const estimate = estimateCosts(generatedProfile, monthlyUsers);
      setCurrentEstimate(estimate);

      // Compare scenarios
      const scenarios = compareScenarios(generatedProfile, monthlyUsers);
      setComparison(scenarios);

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load cost metrics. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast({
      title: 'Data refreshed',
      description: 'Cost metrics have been updated.',
    });
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Loading cost metrics...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const optimizationScore = profile
    ? Math.round(
        ((profile.cacheHitRate + profile.batchingRate) / 2) * 100
      )
    : 0;

  const savingsPercent = comparison
    ? Math.round(
        ((comparison.savings.combined / comparison.baseline.monthlyCost) * 100)
      )
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <PageHeader
              title="TTS Cost Dashboard"
              icon={<DollarSign className="h-8 w-8 text-primary" />}
              breadcrumbs={[
                { label: 'Admin', href: '/admin' },
                { label: 'TTS Costs' },
              ]}
            />
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current Month Spend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {historicalAnalysis
                    ? formatCurrency(historicalAnalysis.totalCost)
                    : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {historicalAnalysis?.totalRequests || 0} requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Projected Monthly</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {currentEstimate
                    ? formatCurrency(currentEstimate.monthlyCost)
                    : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {monthlyUsers} users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Cache Efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {profile
                    ? `${Math.round(profile.cacheHitRate * 100)}%`
                    : '0%'}
                </div>
                <Progress
                  value={profile ? profile.cacheHitRate * 100 : 0}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Optimization Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold">{optimizationScore}%</div>
                  {optimizationScore >= 50 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <Progress value={optimizationScore} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Profile</CardTitle>
                    <CardDescription>Current usage patterns</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Avg chars per request
                          </span>
                          <span className="font-semibold">
                            {profile.avgTextLengthChars}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Requests per session
                          </span>
                          <span className="font-semibold">
                            {profile.requestsPerSession}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Batching rate
                          </span>
                          <span className="font-semibold">
                            {Math.round(profile.batchingRate * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Segmentation rate
                          </span>
                          <span className="font-semibold">
                            {Math.round(profile.segmentationRate * 100)}%
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Historical Analysis</CardTitle>
                    <CardDescription>Last 30 days performance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {historicalAnalysis && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Total requests
                          </span>
                          <span className="font-semibold">
                            {historicalAnalysis.totalRequests.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Avg cost per request
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(historicalAnalysis.avgCostPerRequest)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Daily average
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(historicalAnalysis.dailyAvgCost)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Projected monthly
                          </span>
                          <span className="font-semibold">
                            {formatCurrency(historicalAnalysis.projectedMonthlyCost)}
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Breakdown Tab */}
            <TabsContent value="breakdown" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>By Provider</CardTitle>
                    <CardDescription>Cost distribution by TTS provider</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentEstimate && (
                      <>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">ElevenLabs</span>
                            <span className="font-semibold">
                              {formatCurrency(currentEstimate.breakdown.byProvider.elevenlabs)}
                            </span>
                          </div>
                          <Progress
                            value={
                              (currentEstimate.breakdown.byProvider.elevenlabs /
                                currentEstimate.monthlyCost) *
                              100
                            }
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">OpenAI</span>
                            <span className="font-semibold">
                              {formatCurrency(currentEstimate.breakdown.byProvider.openai)}
                            </span>
                          </div>
                          <Progress
                            value={
                              (currentEstimate.breakdown.byProvider.openai /
                                currentEstimate.monthlyCost) *
                              100
                            }
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>By Mode</CardTitle>
                    <CardDescription>Cost distribution by speech mode</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentEstimate && (
                      <>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">Brief Mode</span>
                            <span className="font-semibold">
                              {formatCurrency(currentEstimate.breakdown.byMode.brief)}
                            </span>
                          </div>
                          <Progress
                            value={
                              (currentEstimate.breakdown.byMode.brief /
                                currentEstimate.monthlyCost) *
                              100
                            }
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">Full Mode</span>
                            <span className="font-semibold">
                              {formatCurrency(currentEstimate.breakdown.byMode.full)}
                            </span>
                          </div>
                          <Progress
                            value={
                              (currentEstimate.breakdown.byMode.full /
                                currentEstimate.monthlyCost) *
                              100
                            }
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cache Impact</CardTitle>
                    <CardDescription>Cost savings from caching</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentEstimate && (
                      <>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-green-600">
                              Saved (cached)
                            </span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(currentEstimate.breakdown.cached)}
                            </span>
                          </div>
                          <Progress
                            value={
                              (currentEstimate.breakdown.cached /
                                (currentEstimate.breakdown.cached +
                                  currentEstimate.breakdown.uncached)) *
                              100
                            }
                            className="bg-green-100"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">Cost (uncached)</span>
                            <span className="font-semibold">
                              {formatCurrency(currentEstimate.breakdown.uncached)}
                            </span>
                          </div>
                          <Progress
                            value={
                              (currentEstimate.breakdown.uncached /
                                (currentEstimate.breakdown.cached +
                                  currentEstimate.breakdown.uncached)) *
                              100
                            }
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Optimization Features</CardTitle>
                    <CardDescription>Impact of batching & segmentation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentEstimate && profile && (
                      <>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">Batched requests</span>
                            <Badge variant="outline">
                              {Math.round(profile.batchingRate * 100)}%
                            </Badge>
                          </div>
                          <Progress value={profile.batchingRate * 100} />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm">Segmented responses</span>
                            <Badge variant="outline">
                              {Math.round(profile.segmentationRate * 100)}%
                            </Badge>
                          </div>
                          <Progress value={profile.segmentationRate * 100} />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Optimizations Tab */}
            <TabsContent value="optimizations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Scenarios</CardTitle>
                  <CardDescription>
                    Compare costs with different optimization levels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {comparison && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">
                            Baseline (no optimizations)
                          </p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(comparison.baseline.monthlyCost)}
                          </p>
                        </div>

                        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                          <p className="text-sm text-muted-foreground mb-2">
                            With Caching
                          </p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(comparison.withCaching.monthlyCost)}
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-green-600">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-sm font-semibold">
                              {formatCurrency(comparison.savings.caching)} saved
                            </span>
                          </div>
                        </div>

                        <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950">
                          <p className="text-sm text-muted-foreground mb-2">
                            With Batching
                          </p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(comparison.withBatching.monthlyCost)}
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-green-600">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-sm font-semibold">
                              {formatCurrency(comparison.savings.batching)} saved
                            </span>
                          </div>
                        </div>

                        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                          <p className="text-sm text-muted-foreground mb-2">
                            All Optimizations
                          </p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(comparison.withAll.monthlyCost)}
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-green-600">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-sm font-semibold">
                              {formatCurrency(comparison.savings.combined)} saved
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg bg-green-100 dark:bg-green-900">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="font-semibold">
                              Current savings: {savingsPercent}%
                            </p>
                            <p className="text-sm text-muted-foreground">
                              You're saving{' '}
                              {formatCurrency(comparison.savings.combined)} per month
                              with current optimizations
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {profile && profile.cacheHitRate < 0.5 && (
                  <Card className="border-yellow-500">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Database className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                        <div>
                          <CardTitle>Improve Cache Hit Rate</CardTitle>
                          <CardDescription>
                            Current: {Math.round(profile.cacheHitRate * 100)}% • Target: 50%+
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">
                        Your cache hit rate is below optimal. Consider these strategies:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            Use TTS templates for common responses to increase cache reuse
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            Implement canonicalization to normalize similar text variations
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            Increase cache expiration time (current: 180 days)
                          </span>
                        </li>
                      </ul>
                      <p className="text-sm mt-4 font-semibold text-green-600">
                        Potential savings: ~
                        {comparison &&
                          formatCurrency(
                            (comparison.baseline.monthlyCost - comparison.withCaching.monthlyCost) *
                              (0.5 - profile.cacheHitRate)
                          )}
                        /month
                      </p>
                    </CardContent>
                  </Card>
                )}

                {profile && profile.batchingRate < 0.4 && (
                  <Card className="border-blue-500">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <Zap className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                          <CardTitle>Enable More Batching</CardTitle>
                          <CardDescription>
                            Current: {Math.round(profile.batchingRate * 100)}% • Target: 40%+
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">
                        Batching short responses reduces API overhead. Recommendations:
                      </p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            Group consecutive brief mode responses ({"<"}12 words each)
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            Use shouldSpeak with batching to automatically group responses
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>
                            Batch confirmations, greetings, and error messages
                          </span>
                        </li>
                      </ul>
                      <p className="text-sm mt-4 font-semibold text-green-600">
                        Potential savings: ~20% reduction in API calls
                      </p>
                    </CardContent>
                  </Card>
                )}

                {profile &&
                  profile.providerDistribution.elevenlabs > 0.8 && (
                    <Card className="border-purple-500">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <TrendingUp className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                          <div>
                            <CardTitle>Consider Provider Mix</CardTitle>
                            <CardDescription>
                              Current: {Math.round(profile.providerDistribution.elevenlabs * 100)}%
                              ElevenLabs
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-4">
                          You're using primarily ElevenLabs. Consider:
                        </p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>
                              Use OpenAI TTS for simple brief mode responses (50% cheaper)
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>
                              Reserve ElevenLabs for full mode and important messages
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>
                              Test quality differences for your use case
                            </span>
                          </li>
                        </ul>
                        <p className="text-sm mt-4 font-semibold text-green-600">
                          Potential savings: ~30% with balanced provider mix
                        </p>
                      </CardContent>
                    </Card>
                  )}

                {profile &&
                  profile.cacheHitRate >= 0.5 &&
                  profile.batchingRate >= 0.4 && (
                    <Card className="border-green-500">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                          <div>
                            <CardTitle>Excellent Optimization!</CardTitle>
                            <CardDescription>
                              Your TTS usage is well-optimized
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-4">
                          You're following best practices:
                        </p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>High cache hit rate ({Math.round(profile.cacheHitRate * 100)}%)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>Good batching usage ({Math.round(profile.batchingRate * 100)}%)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span>
                              Saving {savingsPercent}% compared to baseline
                            </span>
                          </li>
                        </ul>
                        <p className="text-sm mt-4 font-semibold">
                          Keep monitoring these metrics to maintain efficiency.
                        </p>
                      </CardContent>
                    </Card>
                  )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}
