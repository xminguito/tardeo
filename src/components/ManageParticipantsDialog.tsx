import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Participant {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ManageParticipantsDialogProps {
  activityId: string;
  activityTitle: string;
  maxParticipants: number;
  isOpen: boolean;
  onClose: () => void;
  onParticipantRemoved?: () => void;
}

export default function ManageParticipantsDialog({
  activityId,
  activityTitle,
  maxParticipants,
  isOpen,
  onClose,
  onParticipantRemoved,
}: ManageParticipantsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<Participant | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadParticipants();
    }
  }, [isOpen, activityId]);

  const loadParticipants = async () => {
    setLoading(true);
    try {
      // First get participant user_ids
      const { data: participantsData, error: participantsError } = await supabase
        .from('activity_participants')
        .select('id, user_id')
        .eq('activity_id', activityId);

      if (participantsError) throw participantsError;

      if (!participantsData || participantsData.length === 0) {
        setParticipants([]);
        return;
      }

      // Then fetch their profiles
      const userIds = participantsData.map(p => p.user_id).filter(Boolean);
      
      if (userIds.length === 0) {
        setParticipants([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge participant data with profile data
      const mergedParticipants: Participant[] = participantsData.map(p => {
        const profile = profilesData?.find(prof => prof.id === p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          full_name: profile?.full_name || null,
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
        };
      });

      setParticipants(mergedParticipants);
    } catch (error) {
      console.error('Error loading participants:', error);
      toast({
        title: t('common.error'),
        description: t('manageParticipants.loadError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (participant: Participant) => {
    setRemovingUserId(participant.user_id);
    try {
      const { error } = await supabase
        .from('activity_participants')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', participant.user_id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('manageParticipants.userRemoved'),
      });

      // Remove from local state immediately
      setParticipants(prev => prev.filter(p => p.user_id !== participant.user_id));
      
      // Notify parent to refresh
      onParticipantRemoved?.();
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: t('common.error'),
        description: t('manageParticipants.removeError'),
        variant: 'destructive',
      });
    } finally {
      setRemovingUserId(null);
      setConfirmRemoveUser(null);
    }
  };

  const getInitials = (participant: Participant) => {
    if (participant.full_name) {
      return participant.full_name.charAt(0).toUpperCase();
    }
    if (participant.username) {
      return participant.username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = (participant: Participant) => {
    return participant.full_name || participant.username || t('manageParticipants.anonymous');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('manageParticipants.title')} ({participants.length}/{maxParticipants})
            </DialogTitle>
            <DialogDescription>
              {t('manageParticipants.description', { activityTitle })}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t('manageParticipants.noParticipants')}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Link
                      to={`/u/${participant.username || participant.user_id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={participant.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(participant)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getDisplayName(participant)}</p>
                        {participant.username && (
                          <p className="text-sm text-muted-foreground truncate">
                            @{participant.username}
                          </p>
                        )}
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      onClick={() => setConfirmRemoveUser(participant)}
                      disabled={removingUserId === participant.user_id}
                    >
                      {removingUserId === participant.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmRemoveUser} onOpenChange={(open) => !open && setConfirmRemoveUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('manageParticipants.confirmRemoveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('manageParticipants.confirmRemoveDescription', {
                userName: confirmRemoveUser ? getDisplayName(confirmRemoveUser) : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRemoveUser && handleRemoveParticipant(confirmRemoveUser)}
            >
              {t('manageParticipants.removeButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}



