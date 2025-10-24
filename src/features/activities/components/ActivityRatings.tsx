import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useActivityRatings, useSubmitRating, useUserRating } from '../hooks/useActivityRatings';

interface ActivityRatingsProps {
  activityId: string;
}

export function ActivityRatings({ activityId }: ActivityRatingsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useActivityRatings(activityId);
  const { data: userRating } = useUserRating(activityId);
  const submitRating = useSubmitRating();
  
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRating, setSelectedRating] = useState(userRating?.rating || 0);
  const [comment, setComment] = useState(userRating?.comment || '');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedRating === 0) return;

    await submitRating.mutateAsync({
      activityId,
      rating: selectedRating,
      comment: comment.trim() || undefined,
    });

    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedRating(userRating?.rating || 0);
    setComment(userRating?.comment || '');
    setIsEditing(false);
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('activities.ratings.loading')}</div>;
  }

  if (!data) {
    return <div className="text-center py-8">Error cargando valoraciones</div>;
  }

  const { ratings, stats } = data;

  return (
    <div className="space-y-6">
      {/* Average Rating Display */}
      <Card>
        <CardHeader>
          <CardTitle>{t('activities.ratings.averageRating')}</CardTitle>
          <CardDescription>
            {stats.totalRatings === 0
              ? t('activities.ratings.noReviews')
              : t('activities.ratings.totalReviews', { count: stats.totalRatings })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
            </div>
            <div className="flex gap-1" role="img" aria-label={`${stats.averageRating} de 5 estrellas`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${
                    star <= Math.round(stats.averageRating)
                      ? 'fill-primary text-primary'
                      : 'text-muted'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User's Rating Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {userRating ? t('activities.ratings.editReview') : t('activities.ratings.addReview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isAuthenticated ? (
            <div className="text-center py-6 space-y-4">
              <p className="text-muted-foreground">
                {t('activities.ratings.loginRequired')}
              </p>
              <Button onClick={() => navigate('/auth')}>
                {t('activities.ratings.loginButton')}
              </Button>
            </div>
          ) : !isEditing && userRating ? (
            <div className="space-y-4">
              <div className="flex gap-1" role="img" aria-label={`Tu valoración: ${userRating.rating} de 5 estrellas`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= userRating.rating ? 'fill-primary text-primary' : 'text-muted'
                    }`}
                  />
                ))}
              </div>
              {userRating.comment && (
                <p className="text-sm text-muted-foreground">{userRating.comment}</p>
              )}
              <Button onClick={() => setIsEditing(true)} variant="outline">
                {t('activities.ratings.edit')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('activities.ratings.yourRating')}
                </label>
                <div className="flex gap-1" role="radiogroup" aria-label="Selecciona tu valoración">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={selectedRating === star}
                      aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                      onClick={() => setSelectedRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          star <= (hoveredRating || selectedRating)
                            ? 'fill-primary text-primary'
                            : 'text-muted hover:text-primary/50'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="text-sm font-medium mb-2 block">
                  {t('activities.ratings.comment')} {t('activities.ratings.optional')}
                </label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('activities.ratings.commentPlaceholder')}
                  rows={4}
                  aria-label="Tu comentario sobre la actividad"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={selectedRating === 0 || submitRating.isPending}>
                  {submitRating.isPending ? t('activities.ratings.submitting') : t('activities.ratings.submit')}
                </Button>
                {(isEditing || userRating) && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    {t('activities.ratings.cancel')}
                  </Button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Reviews List */}
      {ratings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('activities.ratings.reviews')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ratings.map((rating, index) => (
              <div key={rating.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={rating.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {rating.profiles?.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {rating.profiles?.full_name || t('activities.ratings.anonymous')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-0.5 my-1" role="img" aria-label={`${rating.rating} de 5 estrellas`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rating.rating ? 'fill-primary text-primary' : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      {rating.comment && (
                        <p className="text-sm text-muted-foreground mt-2">{rating.comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
