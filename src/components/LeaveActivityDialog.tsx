import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface LeaveActivityDialogProps {
  activityId: string;
  activityTitle: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onLeft: () => void;
  // Optional props for organizer notification
  organizerId?: string | null;
  organizerName?: string;
  participantName?: string;
  activityDate?: string;
  activityTime?: string;
  activityLocation?: string;
  currentParticipants?: number;
  maxParticipants?: number;
}

export default function LeaveActivityDialog({
  activityId,
  activityTitle,
  userId,
  isOpen,
  onClose,
  onLeft,
  organizerId,
  organizerName,
  participantName,
  activityDate,
  activityTime,
  activityLocation,
  currentParticipants,
  maxParticipants,
}: LeaveActivityDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLeave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('activity_participants')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', userId);

      if (error) throw error;

      // Optionally log the reason (could be stored in a cancellations table in the future)
      if (reason.trim()) {
        console.log('Cancellation reason:', reason);
        // Future: await supabase.from('activity_cancellations').insert({ ... })
      }

      // Send notification email to organizer (if not leaving own activity)
      if (organizerId && organizerId !== userId) {
        try {
          await supabase.functions.invoke('send-activity-notification', {
            body: {
              type: 'organizer_participant_left',
              recipientUserId: organizerId,
              recipientName: organizerName || 'Organizador',
              participantName: participantName || 'Un usuario',
              activityTitle,
              activityDate: activityDate || '',
              activityTime: activityTime || '',
              activityLocation: activityLocation || '',
              activityUrl: window.location.href,
              currentParticipants: Math.max(0, (currentParticipants || 1) - 1),
              maxParticipants: maxParticipants || 20,
            },
          });
        } catch (emailError) {
          console.error('Error sending organizer notification email:', emailError);
          // Don't show error to user, email is secondary
        }
      }

      toast({
        title: t('common.success'),
        description: t('leaveActivity.cancelled'),
      });

      onLeft();
    } catch (error) {
      console.error('Error leaving activity:', error);
      toast({
        title: t('common.error'),
        description: t('leaveActivity.error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setReason('');
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('leaveActivity.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('leaveActivity.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="reason" className="text-sm text-muted-foreground">
            {t('leaveActivity.reasonLabel')}
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('leaveActivity.reasonPlaceholder')}
            className="mt-2"
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t('leaveActivity.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              handleLeave();
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('leaveActivity.leaving')}
              </>
            ) : (
              t('leaveActivity.confirm')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}



