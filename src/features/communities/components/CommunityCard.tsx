import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { CommunityListItem } from '../types/community.types';
import { useJoinCommunity } from '../hooks/useJoinCommunity';
import { useViewTransitionName } from '@/components/PageTransition';

interface CommunityCardProps {
  community: CommunityListItem;
}

export default function CommunityCard({ community }: CommunityCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { join, isJoining } = useJoinCommunity();
  
  // View Transitions API: unique name for hero animation
  const imageTransitionName = useViewTransitionName('community-image', community.id);

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    join(community.id);
  };

  const handleCardClick = () => {
    navigate(`/communities/${community.slug}`);
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-2"
      onClick={handleCardClick}
    >
      {/* Cover Image */}
      {community.cover_image_url ? (
        <div className="h-48 w-full overflow-hidden relative">
          <img
            src={community.cover_image_url}
            alt={community.name}
            className="w-full h-full object-cover"
            style={{ viewTransitionName: imageTransitionName }}
          />
          {/* Avatar overlap */}
          {community.image_url && (
            <div className="absolute -bottom-6 left-4">
              <img
                src={community.image_url}
                alt={community.name}
                className="w-16 h-16 rounded-full border-4 border-background object-cover"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Users className="h-20 w-20 text-primary/40" />
        </div>
      )}

      <CardHeader className={community.cover_image_url && community.image_url ? 'pt-8' : ''}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold leading-tight">{community.name}</h3>
            {community.category && (
              <Badge variant="secondary" className="mt-2">
                {t(`communities.categories.${community.category}`)}
              </Badge>
            )}
          </div>
          {community.is_member && (
            <Badge variant="default" className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              {t('communities.joined')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-muted-foreground line-clamp-2">
          {community.description || t('communities.empty')}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{t('communities.member_count', { count: community.member_count })}</span>
          </div>
          {community.activities_count !== undefined && community.activities_count > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{t('communities.activity_count', { count: community.activities_count })}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {community.tags && community.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {community.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {community.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{community.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        {!community.is_member ? (
          <Button
            onClick={handleJoinClick}
            className="w-full"
            disabled={isJoining}
          >
            {isJoining ? t('common.loading') : t('communities.join')}
          </Button>
        ) : (
          <Button
            onClick={handleCardClick}
            variant="outline"
            className="w-full"
          >
            {t('communities.card.viewCommunity')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
