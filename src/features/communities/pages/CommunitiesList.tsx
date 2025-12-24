import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Filter, Users } from 'lucide-react';
import PageTransition from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommunities } from '../hooks/useCommunities';
import CommunityCard from '../components/CommunityCard';
import CreateCommunityModal from '../components/CreateCommunityModal';
import { COMMUNITY_CATEGORIES } from '../types/community.types';
import type { CommunityFilters } from '../types/community.types';

export default function CommunitiesList() {
  const { t } = useTranslation();
  const [createModalOpen, setCreateModalOpen] = useState(false);
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
        {/* Hero Section - Fixed height to prevent CLS */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 h-[280px] md:h-[320px] flex items-center justify-center">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-4">{t('communities.title')}</h1>
              <p className="text-lg text-muted-foreground mb-6">
                {t('communities.emptyDescription')}
              </p>
              <Button 
                size="lg" 
                className="gap-2"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-5 w-5" />
                {t('communities.create')}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters - Fixed height to prevent CLS */}
        <div className="container mx-auto px-4 py-6 max-w-7xl min-h-[180px] md:min-h-[140px]">
          <div className="flex flex-col md:flex-row gap-4 mb-6 h-10">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('communities.search')}
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={filters.category || 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full md:w-[200px] h-10">
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
          <Tabs defaultValue="all" className="mb-6 h-10">
            <TabsList className="h-10">
              <TabsTrigger 
                value="all"
                onClick={() => setFilters(prev => ({ ...prev, showOnlyJoined: false }))}
                className="h-9"
              >
                {t('communities.categories.all')}
              </TabsTrigger>
              <TabsTrigger 
                value="joined"
                onClick={() => setFilters(prev => ({ ...prev, showOnlyJoined: true }))}
                className="h-9"
              >
                {t('communities.joined')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Communities Grid - Always reserve space to prevent CLS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
            {isLoading ? (
              <>
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden h-fit">
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-6 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <div className="pt-2">
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : communities && communities.length > 0 ? (
              <>
                {communities.map((community) => (
                  <CommunityCard key={community.id} community={community} />
                ))}
              </>
            ) : (
              <div className="col-span-full text-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{t('communities.empty')}</h3>
                <p className="text-muted-foreground mb-6">
                  {t('communities.emptyDescription')}
                </p>
                <Button 
                  className="gap-2"
                  onClick={() => setCreateModalOpen(true)}
                >
                  <Plus className="h-5 w-5" />
                  {t('communities.create')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Community Modal */}
      <CreateCommunityModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </PageTransition>
  );
}
