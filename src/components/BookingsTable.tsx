import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import DirectChatSheet from '@/components/DirectChatSheet';
import { 
  MoreHorizontal, 
  User, 
  MessageCircle, 
  UserMinus, 
  Loader2,
  Calendar,
  Users,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { es, ca, enUS, fr, it, de } from 'date-fns/locale';

interface Booking {
  id: string;
  joined_at: string;
  participant: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  activity: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    max_participants: number;
  };
}

interface BookingsTableProps {
  userId: string;
  onBookingRemoved?: () => void;
}

const localeMap: Record<string, Locale> = { es, ca, en: enUS, fr, it, de };

interface ChatUser {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function BookingsTable({ userId, onBookingRemoved }: BookingsTableProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Booking | null>(null);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openChatWith = (participant: Booking['participant']) => {
    setChatUser({
      id: participant.id,
      full_name: participant.full_name,
      username: participant.username,
      avatar_url: participant.avatar_url,
    });
    setIsChatOpen(true);
  };

  const closeChatSheet = () => {
    setIsChatOpen(false);
    // Delay clearing user to allow animation
    setTimeout(() => setChatUser(null), 300);
  };

  useEffect(() => {
    loadBookings();
  }, [userId]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      // Get today's date for filtering upcoming activities
      const today = new Date().toISOString().split('T')[0];

      // First, get all activities created by this user
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, title, date, time, location, max_participants')
        .eq('created_by', userId)
        .gte('date', today)
        .order('date', { ascending: true });

      if (activitiesError) throw activitiesError;

      if (!activities || activities.length === 0) {
        setBookings([]);
        return;
      }

      const activityIds = activities.map(a => a.id);

      // Get all participants for these activities
      const { data: participants, error: participantsError } = await supabase
        .from('activity_participants')
        .select('id, activity_id, user_id, joined_at')
        .in('activity_id', activityIds)
        .order('joined_at', { ascending: false });

      if (participantsError) throw participantsError;

      if (!participants || participants.length === 0) {
        setBookings([]);
        return;
      }

      // Get all unique user IDs
      const userIds = [...new Set(participants.map(p => p.user_id).filter(Boolean))];

      // Fetch profiles for all participants
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Build the bookings array
      const bookingsData: Booking[] = participants.map(p => {
        const activity = activities.find(a => a.id === p.activity_id)!;
        const profile = profiles?.find(prof => prof.id === p.user_id);
        
        return {
          id: p.id,
          joined_at: p.joined_at,
          participant: {
            id: p.user_id,
            full_name: profile?.full_name || null,
            username: profile?.username || null,
            avatar_url: profile?.avatar_url || null,
          },
          activity: {
            id: activity.id,
            title: activity.title,
            date: activity.date,
            time: activity.time,
            location: activity.location,
            max_participants: activity.max_participants,
          },
        };
      });

      setBookings(bookingsData);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: t('common.error'),
        description: t('organizerDashboard.errorLoadingBookings'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (booking: Booking) => {
    setRemovingId(booking.id);
    try {
      const { error } = await supabase
        .from('activity_participants')
        .delete()
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('organizerDashboard.participantRemoved'),
      });

      // Remove from local state
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      onBookingRemoved?.();
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: t('common.error'),
        description: t('organizerDashboard.errorRemovingParticipant'),
        variant: 'destructive',
      });
    } finally {
      setRemovingId(null);
      setConfirmRemove(null);
    }
  };

  const getInitials = (participant: Booking['participant']) => {
    if (participant.full_name) return participant.full_name.charAt(0).toUpperCase();
    if (participant.username) return participant.username.charAt(0).toUpperCase();
    return 'U';
  };

  const getDisplayName = (participant: Booking['participant']) => {
    return participant.full_name || participant.username || t('organizerDashboard.anonymous');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = localeMap[i18n.language] || es;
    return format(date, 'd MMM yyyy', { locale });
  };

  const getProfileUrl = (participant: Booking['participant']) => {
    return `/u/${participant.username || participant.id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
        <h3 className="text-lg font-medium mb-1">{t('organizerDashboard.noBookings')}</h3>
        <p className="text-muted-foreground text-sm">{t('organizerDashboard.noBookingsDesc')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">{t('organizerDashboard.participant')}</TableHead>
              <TableHead>{t('organizerDashboard.activity')}</TableHead>
              <TableHead className="w-[130px]">{t('organizerDashboard.eventDate')}</TableHead>
              <TableHead className="w-[100px]">{t('organizerDashboard.status')}</TableHead>
              <TableHead className="w-[70px] text-right">{t('organizerDashboard.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                {/* Participant */}
                <TableCell>
                  <Link
                    to={getProfileUrl(booking.participant)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-9 w-9 border">
                      <AvatarImage src={booking.participant.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(booking.participant)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {getDisplayName(booking.participant)}
                      </span>
                      {booking.participant.username && (
                        <span className="text-xs text-muted-foreground">
                          @{booking.participant.username}
                        </span>
                      )}
                    </div>
                  </Link>
                </TableCell>

                {/* Activity */}
                <TableCell>
                  <Link
                    to={`/actividades/${booking.activity.id}`}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <span className="line-clamp-1">{booking.activity.title}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                  </Link>
                </TableCell>

                {/* Event Date */}
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{formatDate(booking.activity.date)}</span>
                      <span className="text-xs text-muted-foreground">
                        {booking.activity.time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                    {t('organizerDashboard.confirmed')}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        disabled={removingId === booking.id}
                      >
                        {removingId === booking.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={getProfileUrl(booking.participant)} className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          {t('organizerDashboard.viewProfile')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => openChatWith(booking.participant)}
                        className="flex items-center cursor-pointer"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {t('organizerDashboard.sendMessage')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmRemove(booking)}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        {t('organizerDashboard.cancelBooking')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('organizerDashboard.confirmRemoveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('organizerDashboard.confirmRemoveDescription', {
                userName: confirmRemove ? getDisplayName(confirmRemove.participant) : '',
                activityTitle: confirmRemove?.activity.title || '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRemove && handleRemoveParticipant(confirmRemove)}
            >
              {t('organizerDashboard.removeButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Direct Chat Sheet */}
      <DirectChatSheet
        isOpen={isChatOpen}
        onClose={closeChatSheet}
        otherUser={chatUser}
      />
    </>
  );
}
