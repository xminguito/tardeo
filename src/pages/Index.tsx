import {useEffect, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useQueryClient} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
import {Button} from "@/components/ui/button";
import {generateActivitySlug} from "@/lib/utils";
import ActivityCard from "@/components/ActivityCard";
import CreateActivityDialog from "@/components/CreateActivityDialog";
import {useToast} from "@/hooks/use-toast";
import {useFavorites} from "@/features/activities/hooks/useFavorites";
import {ACTIVITIES_QUERY_KEY, useActivities} from "@/features/activities/hooks/useActivities";
import {useNextActivity} from "@/features/activities/hooks/useUpcomingActivities";
import {useCommunities} from "@/features/communities/hooks/useCommunities";
import CommunityCard from "@/features/communities/components/CommunityCard";
import {useSliderByPage} from "@/hooks/useSliderByPage";
import PageTransition from "@/components/PageTransition";
import HeroSlider from "@/components/HeroSlider";
import UserDashboardHero from "@/components/UserDashboardHero";
import {Plus, UsersRound} from "lucide-react";

const Index = () => {
    const [user, setUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isUserAdmin, setIsUserAdmin] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const {toast} = useToast();
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const {isFavorite, toggleFavorite, favorites} = useFavorites(user?.id);

    // Use the enhanced useActivities hook that includes participant data
    const {data: activities = [], isLoading: loading} = useActivities();

    // Fetch communities
    const {data: communities = [], isLoading: communitiesLoading} = useCommunities();

    // Fetch user's upcoming activities for personalized hero
    const {nextActivity, upcomingActivities, upcomingCount, isLoading: upcomingLoading} = useNextActivity();

    // Limit to 6 activities for the home page
    const featuredActivities = activities.slice(0, 6);

    // Limit to 4 communities for the home page
    const featuredCommunities = communities.slice(0, 4);

    // Load slider for home page
    const {slides: heroSlides, loading: bannersLoading} = useSliderByPage('/');

    useEffect(() => {
        checkUser();
    }, []);

    // Check if we should open the create dialog (coming back from auth)
    useEffect(() => {
        if (!user) return;

        // Check for state (password/magic link login)
        if (location.state?.openCreateDialog) {
            setIsCreateDialogOpen(true);
            // Clear the state to prevent reopening on refresh
            window.history.replaceState({}, document.title);
            return;
        }

        // Check for URL param (OAuth login)
        const params = new URLSearchParams(location.search);
        if (params.get('openCreate') === 'true') {
            setIsCreateDialogOpen(true);
            // Clear the URL param to prevent reopening on refresh
            params.delete('openCreate');
            const newUrl = params.toString()
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [user, location.state, location.search]);

    const checkUser = async () => {
        const {data: {session}} = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            loadNotifications(session.user.id);
            checkIfAdmin(session.user.id);
            loadUserProfile(session.user.id);
        }

        const {data: {subscription}} = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user || null);
            if (session?.user) {
                loadNotifications(session.user.id);
                checkIfAdmin(session.user.id);
                loadUserProfile(session.user.id);
            } else {
                setIsUserAdmin(false);
                setUserProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    };

    const loadUserProfile = async (userId: string) => {
        const {data} = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

        if (data) setUserProfile(data);
    };

    const checkIfAdmin = async (userId: string) => {
        const {data} = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('role', 'admin')
            .maybeSingle();

        setIsUserAdmin(!!data);
    };

    const loadNotifications = async (userId: string) => {
        const {data} = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .eq("read", false)
            .order("created_at", {ascending: false})
            .limit(3);

        if (data) setNotifications(data);
    };

    const handleActivityCreated = () => {
        // Invalidate and refetch activities
        queryClient.invalidateQueries({queryKey: ACTIVITIES_QUERY_KEY});
    };

    const handleCreateClick = () => {
        if (user) {
            // User is logged in - open the dialog
            setIsCreateDialogOpen(true);
        } else {
            // Guest - redirect to auth with return state
            navigate("/auth", {state: {from: "create-activity"}});
        }
    };

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">
            <PageTransition>
                {/* Hero Section - Conditional based on user state */}
                <div className="container mx-auto px-4 pt-8 pb-4 max-w-7xl">
                    {user && nextActivity && !upcomingLoading ? (
                        /* State A: Active User Dashboard */
                        <UserDashboardHero
                            userName={userProfile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Usuario'}
                            activities={upcomingActivities}
                        />
                    ) : !user ? (
                        /* State B: Discovery Mode for non-logged users */
                        !bannersLoading && heroSlides.length > 0 ? (
                            <HeroSlider slides={heroSlides} autoplayInterval={5000}/>
                        ) : null
                    ) : (
                        /* State C: Logged in but no upcoming activities - show discovery slider */
                        !bannersLoading && heroSlides.length > 0 && (
                            <HeroSlider slides={heroSlides} autoplayInterval={5000}/>
                        )
                    )}
                </div>

                <main className="container mx-auto px-4 py-12 max-w-7xl">
                    {!user && (
                        <div className="bg-secondary/20 border-2 border-secondary rounded-2xl p-8 mb-12 text-center">
                            <h2 className="text-3xl font-semibold mb-4">{t('home.joinCommunity')}</h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                {t('home.joinCommunityDesc')}
                            </p>
                            <Button size="lg" onClick={() => navigate("/auth")}>
                                {t('home.joinFree')}
                            </Button>
                        </div>
                    )}

                    <section className="mb-12">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <h2 className="text-2xl md:text-3xl font-semibold">{t('home.featuredActivities')}</h2>
                            <div className="flex gap-2 md:gap-3 flex-shrink-0">
                                <Button
                                    size="sm"
                                    className="md:size-default gap-2"
                                    onClick={handleCreateClick}
                                >
                                    <Plus className="h-4 w-4"/>
                                    {t('home.createActivity')}
                                </Button>
                                <Button variant="outline" size="sm" className="md:size-default bg-secondary text-white"
                                        onClick={() => navigate("/actividades")}>
                                    {t('home.viewAll')}
                                </Button>
                            </div>

                            {/* Create Activity Dialog - Controlled mode */}
                            <CreateActivityDialog
                                onActivityCreated={handleActivityCreated}
                                isOpen={isCreateDialogOpen}
                                onClose={() => setIsCreateDialogOpen(false)}
                            />
                        </div>
                        {loading ? (
                            <p className="text-muted-foreground text-lg">{t('common.loading')}</p>
                        ) : featuredActivities.length === 0 ? (
                            <p className="text-muted-foreground text-lg">{t('home.noActivitiesYet')}</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {featuredActivities.map((activity, index) => (
                                        <div
                                            key={activity.id}
                                            onClick={() => navigate(`/actividades/${generateActivitySlug(activity.title, activity.id)}`)}
                                            className="cursor-pointer animate-fade-in"
                                            style={{animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards'}}
                                        >
                                            <ActivityCard
                                                activity={activity}
                                                onReserve={(id) => {
                                                    const act = featuredActivities.find(a => a.id === id);
                                                    if (act) navigate(`/actividades/${generateActivitySlug(act.title, act.id)}`);
                                                }}
                                                isFavorite={isFavorite(activity.id)}
                                                onToggleFavorite={toggleFavorite}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-center mt-8">
                                    <Button size="default" variant="outline" onClick={() => navigate("/actividades")}>
                                        {t('home.viewFullCalendar')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </section>

                    {/* Communities CTA Section */}
                    <div
                        className="relative overflow-hidden rounded-3xl p-1 mb-12 animate-fade-in border border-black"
                        style={{ background: 'linear-gradient(135deg, rgba(219, 47, 123, 1) 0%, rgba(225, 85, 144, 1) 50%, rgba(83, 72, 228, 1) 100%)' }}>
                        <div className="bg-background rounded-[calc(1.5rem-4px)] p-5">
                            <div className="flex flex-col md:flex-row items-center justify-start gap-8">
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent"
                                        style={{ backgroundImage: 'linear-gradient(90deg, rgba(89, 72, 225, 1) 0%, rgba(236, 72, 153, 1) 46%, rgba(219, 36, 119, 1) 100%)' }}>
                                        {t('home.findYourTribe')}
                                    </h2>
                                    <p className="text-lg text-muted-foreground mb-6">
                                        {t('home.findYourTribeDesc')}
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                                        <Button
                                            size="lg"
                                            onClick={() => navigate("/communities")}
                                            className="text-white border"
                                            style={{ background: 'linear-gradient(90deg, rgba(224, 85, 143, 1) 0%, rgba(218, 37, 119, 1) 100%)', borderColor: 'rgba(218, 37, 118, 1)' }}
                                        >
                                            <UsersRound className="mr-2 h-5 w-5"/>
                                            {t('home.exploreCommunities')}
                                        </Button>
                                        {user && (
                                            <Button
                                                size="lg"
                                                variant="outline"
                                                onClick={() => navigate("/communities")}
                                                className="border-2"
                                            >
                                                {t('home.createYourOwn')}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <div className="relative w-48 h-48 md:w-64 md:h-64">
                                        <div
                                            className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
                                        <div className="relative flex items-center justify-center h-full">
                                            <UsersRound className="w-32 h-32 md:w-40 md:h-40" style={{ color: 'rgba(217, 40, 119, 0.6)' }}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Featured Communities Section */}
                    <section className="mb-12">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            <h2 className="text-2xl md:text-3xl font-semibold">{t('home.featuredCommunities')}</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                className="md:size-default text-white hover:text-white"
                                style={{ backgroundColor: 'rgba(83, 72, 228, 1)', borderColor: 'rgba(83, 72, 228, 1)' }}
                                onClick={() => navigate("/communities")}
                            >
                                {t('home.viewAllCommunities')}
                            </Button>
                        </div>
                        {communitiesLoading ? (
                            <p className="text-muted-foreground text-lg">{t('common.loading')}</p>
                        ) : featuredCommunities.length === 0 ? (
                            <p className="text-muted-foreground text-lg">{t('home.noCommunities')}</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {featuredCommunities.map((community, index) => (
                                    <div
                                        key={community.id}
                                        className="animate-fade-in"
                                        style={{animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards'}}
                                    >
                                        <CommunityCard community={community}/>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </main>
            </PageTransition>
        </div>
    );
};

export default Index;
