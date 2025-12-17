import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter } from 'lucide-react';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCommunities } from '../hooks/useCommunities';
import CommunityCard from '../components/CommunityCard';
import { COMMUNITY_CATEGORIES } from '../types/community.types';
import type { CommunityFilters } from '../types/community.types';
import { Skeleton } from '@/components/ui/skeleton';

export default function CommunitiesList() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<CommunityFilters>({
    search: '',
    category: null,
    showOnlyJoined: false,
  });

  const { data: communities, isLoading } = useCommunities(filters);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      category: value === 'all' ? null : value 
    }));
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <Header user={null} />

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-4">{t('communities.title')}</h1>
              <p className="text-lg text-muted-foreground mb-6">
                {t('communities.emptyDescription')}
              </p>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                {t('communities.create')}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('communities.search')}
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={filters.category || 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('communities.filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('communities.categories.all')}</SelectItem>
                {Object.values(COMMUNITY_CATEGORIES).map((category) => (
                  <SelectItem key={category} value={category}>
                    {t(`communities.categories.${category}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tab Filters */}
          <Tabs defaultValue="all" className="mb-6">
            <TabsList>
              <TabsTrigger 
                value="all"
                onClick={() => setFilters(prev => ({ ...prev, showOnlyJoined: false }))}
              >
                {t('communities.categories.all')}
              </TabsTrigger>
              <TabsTrigger 
                value="joined"
                onClick={() => setFilters(prev => ({ ...prev, showOnlyJoined: true }))}
              >
                {t('communities.joined')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Communities Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : communities && communities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('communities.empty')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('communities.emptyDescription')}
              </p>
              <Button className="gap-2">
                <Plus className="h-5 w-5" />
                {t('communities.create')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border rounded-lg ${className}`}>{children}</div>;
}
