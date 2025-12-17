import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users as UsersIcon, Calendar, Settings } from 'lucide-react';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCommunity } from '../hooks/useCommunity';
import { useJoinCommunity } from '../hooks/useJoinCommunity';
import { Skeleton } from '@/components/ui/skeleton';
import NotFound from '@/pages/NotFound';

export default function CommunityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: community, isLoading } = useCommunity(slug!);
  const { join, leave, isJoining, isLeaving } = useJoinCommunity();

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Header user={null} />
          <div className="container mx-auto px-4 py-6">
            <Skeleton className="h-64 w-full rounded-xl mb-6" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!community) {
    return <NotFound />;
  }

  const handleJoinLeave = () => {
    if (community.is_member) {
      leave(community.id);
    } else {
      join(community.id);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <Header user={null} />

        {/* Cover Image */}
        {community.cover_image_url && (
          <div className="h-64 md:h-96 w-full overflow-hidden relative">
            <img
              src={community.cover_image_url}
              alt={community.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            className="mb-4 mt-6"
            onClick={() => navigate('/communities')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>

          {/* Community Info Card */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
              {/* Avatar */}
              {community.image_url && (
                <img
                  src={community.image_url}
                  alt={community.name}
                  className="w-32 h-32 rounded-full border-4 border-background object-cover shadow-xl -mt-16 md:-mt-20"
                />
              )}

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                      {community.name}
                    </h1>
                    {community.category && (
                      <Badge variant="secondary">
                        {t(`communities.categories.${community.category}`)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleJoinLeave}
                      disabled={isJoining || isLeaving}
                      size="lg"
                    >
                      {isJoining || isLeaving
                        ? t('common.loading')
                        : community.is_member
                        ? t('communities.leave')
                        : t('communities.join')}
                    </Button>
                    {community.user_role === 'admin' && (
                      <Button variant="outline" size="lg">
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4" />
                    <span>{t('communities.member_count', { count: community.member_count })}</span>
                  </div>
                  {community.activities_count > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('communities.activity_count', { count: community.activities_count })}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {community.description && (
                  <p className="mt-4 text-muted-foreground leading-relaxed">
                    {community.description}
                  </p>
                )}

                {/* Tags */}
                {community.tags && community.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {community.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="activities" className="mt-8">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="activities">
                  {t('communities.detail.tabs.activities')}
                </TabsTrigger>
                <TabsTrigger value="members">
                  {t('communities.detail.tabs.members')}
                </TabsTrigger>
                <TabsTrigger value="about">
                  {t('communities.detail.tabs.about')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activities" className="space-y-4">
                {community.activities_count === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      {t('communities.detail.noActivities')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('communities.detail.noActivitiesDescription')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    {/* TODO: Add ActivityList component filtered by community_id */}
                    {t('common.loading')}...
                  </div>
                )}
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
                <div className="text-center py-16 text-muted-foreground">
                  {/* TODO: Add members list */}
                  {t('common.loading')}...
                </div>
              </TabsContent>

              <TabsContent value="about" className="space-y-4">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <h2>{t('communities.about')}</h2>
                  <p>{community.description || t('communities.empty')}</p>
                  
                  {community.tags && community.tags.length > 0 && (
                    <>
                      <h3>{t('communities.create.tags')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {community.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}

                  <h3>{t('communities.detail.organizedBy')}</h3>
                  <p className="text-muted-foreground">
                    {/* TODO: Add organizer info */}
                    {t('common.loading')}...
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
