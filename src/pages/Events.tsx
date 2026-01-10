import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, MapPin, Users, ChevronRight, Star, Trophy, AlertCircle, RefreshCw, Skull, Ghost, Flame, Eye, Clock, Lock, Gamepad2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import { GlobalRegisterButton } from '@/components/GlobalRegisterButton';
import { RegistrationEndingTimer } from '@/components/RegistrationEndingTimer';
import { toast } from 'sonner';

// E-Sports Games Configuration
const ESPORTS_GAMES = [
    { id: 'valorant', name: 'Valorant', image: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/80eb7ecc9bf36b8a5d215c5b01c93b4b32c5c263-1920x1080.jpg', color: 'from-red-500 to-red-700' },
    { id: 'freefire', name: 'Free Fire', image: 'https://staticg.sportskeeda.com/editor/2022/05/c461c-16533606193095-1920.jpg', color: 'from-orange-500 to-yellow-600' },
    { id: 'bgmi', name: 'BGMI', image: 'https://staticg.sportskeeda.com/editor/2022/07/dfe94-16580991729498-1920.jpg', color: 'from-yellow-500 to-amber-600' },
];


interface Event {
    id: string;
    name: string;
    category: string;
    description: string;
    event_date: string;
    venue: string;
    max_participants: number;
    current_participants: number;
    registration_fee: number;
    prize_pool: number;
    is_featured: boolean;
    image_url: string;
    event_type: string;
    registration_start_date?: string;
    registration_end_date?: string;
}

export default function Events() {
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showFestRegistrationAlert, setShowFestRegistrationAlert] = useState(false);
    const [globalButtonAction, setGlobalButtonAction] = useState<string>('fest_registration');
    const [showGameSelection, setShowGameSelection] = useState(false);
    const [selectedGamingEvent, setSelectedGamingEvent] = useState<Event | null>(null);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .in('status', ['upcoming', 'ongoing'])
                .order('is_featured', { ascending: false })
                .order('event_date');

            if (error) throw error;

            // For fest-type events, get the actual approved registrations count
            // Use Promise.allSettled to handle individual failures gracefully
            const eventsWithCounts = await Promise.all((data || []).map(async (event: any) => {
                try {
                    if (event.event_type === 'fest') {
                        // Count approved fest registrations from profiles
                        const { count } = await supabase
                            .from('profiles')
                            .select('*', { count: 'exact', head: true })
                            .eq('fest_payment_status', 'approved')
                            .eq('is_fest_registered', true);

                        return { ...event, current_participants: count || 0 };
                    }
                    return event;
                } catch (err) {
                    console.error('Error fetching participant count for event:', event.id, err);
                    return event; // Fallback to original event data
                }
            }));

            setEvents(eventsWithCounts);

            // Fetch fest settings for global button action
            const { data: festData } = await (supabase.from('fest_settings' as any) as any).select('global_button_action').single();
            if (festData?.global_button_action) {
                setGlobalButtonAction(festData.global_button_action);
            }
        } catch (err: unknown) {
            console.error('Error fetching events:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to load events. Please try again.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);
        fetchEvents();

        // Real-time subscription
        const channel = supabase
            .channel('public:events')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'events',
                },
                () => {
                    fetchEvents();
                }
            )
            .subscribe();

        // Show alert about fest registration requirement only ONCE per session
        const hasSeenFestAlert = sessionStorage.getItem('hasSeenFestRegistrationAlert');
        if (!hasSeenFestAlert) {
            setShowFestRegistrationAlert(true);
            sessionStorage.setItem('hasSeenFestRegistrationAlert', 'true');
        }

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchEvents]);

    const categories = useMemo(() => {
        const cats = [...new Set(events.map(e => e.category))];
        return ['all', ...cats];
    }, [events]);

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                event.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [events, searchQuery, selectedCategory]);

    const handleRegister = (eventId: string, registrationStatus: { status: string; canRegister: boolean; message: string }) => {
        // Block registration if not allowed
        if (!registrationStatus.canRegister) {
            toast.error(registrationStatus.message || 'Registration is not available');
            return;
        }

        if (globalButtonAction === 'fest_registration') {
            navigate('/fest-registration');
        } else {
            navigate('/register', { state: { selectedEvent: eventId } });
        }
    };

    const handleViewDetails = (eventId: string) => {
        navigate(`/events/${eventId}`);
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Animated Background */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-red-950/10 to-black" />
                {/* Floating particles */}
                <div className="absolute inset-0 opacity-20">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-red-500/50 rounded-full animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${2 + Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>
                {/* Red glow */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        background: 'radial-gradient(ellipse at center top, rgba(139, 0, 0, 0.4) 0%, transparent 60%)'
                    }}
                />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-[60] bg-black/95 backdrop-blur-sm border-b border-red-900/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back to Home</span>
                    </Link>
                    <Link to="/" className="text-xl sm:text-2xl font-bold text-red-500" style={{ fontFamily: 'Cinzel, serif' }}>
                        KAIZEN RITP
                    </Link>
                    <GlobalRegisterButton className="text-sm" />
                </div>
            </header>

            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-12">
                {/* HIERARCHY 1: Registration Deadline Timer - TOP PRIORITY */}
                <div className="mb-6">
                    <RegistrationEndingTimer />
                </div>

                {/* HIERARCHY 2: Important Note Banner */}
                <div className="mb-8 bg-gradient-to-r from-yellow-900/30 via-yellow-800/20 to-yellow-900/30 border border-yellow-500/30 rounded-xl backdrop-blur-sm overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-center gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-500" />
                        <p className="text-sm md:text-base font-medium text-yellow-400 text-center">
                            Note: You must complete <span className="font-bold text-yellow-300">Fest Registration</span> before registering for any events.
                        </p>
                    </div>
                </div>

                {/* HIERARCHY 3: Hero Section with Title */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <Skull className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 animate-pulse" />
                        <Ghost className="w-6 h-6 sm:w-8 sm:h-8 text-red-500/60" />
                        <Flame className="w-7 h-7 sm:w-9 sm:h-9 text-orange-500/70" />
                    </div>

                    <h1
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-3 text-red-500"
                        style={{
                            fontFamily: 'Cinzel, serif',
                            textShadow: '0 0 40px rgba(255, 0, 0, 0.5), 0 0 80px rgba(139, 0, 0, 0.3)',
                            letterSpacing: '0.05em'
                        }}
                    >
                        EXPLORE EVENTS
                    </h1>

                    <p className="text-lg sm:text-xl text-red-200/70 max-w-2xl mx-auto mb-1">
                        Step into the unknown. Choose your challenge.
                    </p>
                    <p className="text-sm text-red-400/50">
                        The Upside Down awaits those brave enough to compete
                    </p>
                </div>

                {/* HIERARCHY 4: Search & Filter */}
                <div className="mb-8 space-y-4">
                    {/* Search Bar */}
                    <div className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500/60" aria-hidden="true" />
                        <input
                            type="text"
                            aria-label="Search events by name, category, or description"
                            placeholder="Search events by name, category, or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-black/60 border border-red-900/50 text-white placeholder:text-red-800/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none rounded-lg transition-all"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3" role="tablist" aria-label="Filter events by category">
                        {categories.map((category) => (
                            <button
                                key={category}
                                role="tab"
                                aria-selected={selectedCategory === category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === category
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                                    : 'bg-black/50 border border-red-900/40 text-red-400 hover:border-red-600/60 hover:text-red-300'
                                    }`}
                            >
                                {category === 'all' ? 'All Events' : category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="max-w-2xl mx-auto mb-8">
                        <Alert variant="destructive" className="bg-red-950/20 border-red-900/50 text-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription className="flex items-center justify-between gap-4">
                                <span>{error}</span>
                                <Button variant="outline" size="sm" onClick={fetchEvents} className="border-red-500/50 hover:bg-red-950/50 text-red-400">
                                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Events Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-black/40 border border-red-900/30 rounded-xl overflow-hidden">
                                <Skeleton className="h-48 w-full bg-red-900/10" />
                                <div className="p-5 space-y-3">
                                    <Skeleton className="h-6 w-3/4 bg-red-900/10" />
                                    <Skeleton className="h-4 w-full bg-red-900/10" />
                                    <Skeleton className="h-4 w-2/3 bg-red-900/10" />
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <Skeleton className="h-14 w-full bg-red-900/10" />
                                        <Skeleton className="h-14 w-full bg-red-900/10" />
                                    </div>
                                    <Skeleton className="h-11 w-full bg-red-900/10 mt-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredEvents.length === 0 && !error ? (
                    <div className="text-center py-16 bg-black/40 border border-red-900/30 rounded-xl max-w-2xl mx-auto">
                        <Search className="w-16 h-16 text-red-900/40 mx-auto mb-4" />
                        <p className="text-red-500 text-xl mb-2 font-bold">No events found</p>
                        <p className="text-red-400/60 mb-4">
                            {searchQuery ? `No events matching "${searchQuery}"` : 'No events available at the moment'}
                        </p>
                        {searchQuery && (
                            <Button
                                variant="outline"
                                onClick={() => setSearchQuery('')}
                                className="border-red-600 text-red-400 hover:bg-red-950/50"
                            >
                                Clear search
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map((event) => (
                            <EventCard
                                key={event.id}
                                event={event}
                                onViewDetails={() => {
                                    // Check if it's a Gaming/E-Sports event
                                    if (event.category === 'Gaming' || event.category === 'E-Sports') {
                                        setSelectedGamingEvent(event);
                                        setShowGameSelection(true);
                                    } else {
                                        navigate(`/events/${event.id}`);
                                    }
                                }}
                                onRegister={() => handleRegister(event.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Stats Section */}
                {!loading && filteredEvents.length > 0 && (
                    <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard label="Total Events" value={events.length} />
                        <StatCard label="Categories" value={categories.length - 1} />
                        <StatCard label="Featured" value={events.filter(e => e.is_featured).length} />
                        <StatCard label="Total Prizes" value={`₹${events.reduce((sum, e) => sum + (e.prize_pool || 0), 0).toLocaleString()}`} />
                    </div>
                )}
            </main>

            <AlertDialog open={showFestRegistrationAlert} onOpenChange={setShowFestRegistrationAlert}>
                <AlertDialogContent className="bg-zinc-950 border border-red-900/50 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-500 text-xl font-bold font-cinzel flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Fest Registration Required
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-300">
                            To participate in any events, you must first complete the mandatory Fest Registration.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel
                            onClick={() => setShowFestRegistrationAlert(false)}
                            className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white mt-0"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            Browse Events
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowFestRegistrationAlert(false);
                                navigate('/fest-registration');
                            }}
                            className="bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white border-none"
                        >
                            Register for Fest
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* E-Sports Game Selection Modal */}
            {showGameSelection && selectedGamingEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowGameSelection(false)}>
                    <div
                        className="relative w-full max-w-4xl bg-gradient-to-br from-zinc-900 via-black to-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="relative p-6 border-b border-zinc-800">
                            <button
                                onClick={() => setShowGameSelection(false)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                                    <Gamepad2 className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Select Your Game</h2>
                                    <p className="text-zinc-400">{selectedGamingEvent.name} - Choose your battlefield</p>
                                </div>
                            </div>
                        </div>

                        {/* Games Grid */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {ESPORTS_GAMES.map((game, index) => (
                                    <button
                                        key={game.id}
                                        onClick={() => {
                                            setShowGameSelection(false);
                                            navigate(`/events/${selectedGamingEvent.id}?game=${game.id}`);
                                        }}
                                        className="group relative aspect-[4/3] rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        {/* Game Image */}
                                        <img
                                            src={game.image}
                                            alt={game.name}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />

                                        {/* Overlay Gradient */}
                                        <div className={`absolute inset-0 bg-gradient-to-t ${game.color} opacity-60 group-hover:opacity-40 transition-opacity`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                        {/* Game Number Badge */}
                                        <div className="absolute top-3 left-3 w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/20 rounded-full">
                                            <span className="text-white font-bold">{index + 1}</span>
                                        </div>

                                        {/* Game Name */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                                                {game.name}
                                            </h3>
                                            <p className="text-white/70 text-sm mt-1 group-hover:text-white transition-colors">
                                                Click to register
                                            </p>
                                        </div>

                                        {/* Hover Border Effect */}
                                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/50 rounded-xl transition-colors" />

                                        {/* Play Icon on Hover */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-16 h-16 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                                                <ChevronRight className="w-8 h-8 text-white ml-1" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Info Text */}
                            <p className="text-center text-zinc-500 text-sm mt-6">
                                🎮 Choose your game to view event details and register
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="relative z-10 border-t border-red-900/50 py-8 mt-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-red-500/60 text-sm mb-4">
                        Ready to face your fears?
                    </p>
                    <GlobalRegisterButton className="px-8 py-3" />
                    <p className="text-red-500/40 text-xs mt-6">
                        © 2026 KAIZEN RITP. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

interface RegistrationStatusType {
    status: 'open' | 'upcoming' | 'closed';
    label: string;
    message: string;
    canRegister: boolean;
}

function EventCard({ event, onViewDetails, onRegister }: {
    event: Event;
    onViewDetails: () => void;
    onRegister: (eventId: string, registrationStatus: RegistrationStatusType) => void
}) {
    const registrationStatus = useMemo((): RegistrationStatusType => {
        const now = new Date();

        // Check if registration hasn't started yet
        if (event.registration_start_date && new Date(event.registration_start_date) > now) {
            return {
                status: 'upcoming',
                label: 'Coming Soon',
                message: `Registration opens on ${new Date(event.registration_start_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}`,
                canRegister: false
            };
        }

        // Check if registration has ended
        if (event.registration_end_date && new Date(event.registration_end_date) < now) {
            return { status: 'closed', label: 'Closed', message: 'Registration has ended for this event', canRegister: false };
        }

        // Check if max participants reached
        if (event.max_participants > 0 && event.current_participants >= event.max_participants) {
            return { status: 'closed', label: 'Full', message: 'Maximum participants reached', canRegister: false };
        }

        return { status: 'open', label: 'Register', message: 'Registration is open', canRegister: true };
    }, [event]);

    // Determine if it's a free or paid event
    const isFreeEvent = !event.registration_fee || event.registration_fee === 0;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewDetails();
        }
    };

    return (
        <div
            role="article"
            tabIndex={0}
            aria-label={`${event.name} - ${event.category} event. ${registrationStatus.canRegister ? 'Registration open' : registrationStatus.label}`}
            className="group relative bg-black border border-red-900/50 hover:border-red-500/70 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-red-900/30 rounded-xl overflow-hidden flex flex-col cursor-pointer"
            onClick={onViewDetails}
            onKeyDown={handleKeyDown}
        >
            {/* Premium Card Image Section with Dark Overlay */}
            <div className="relative h-52 overflow-hidden">
                {/* Background Image - Covers full area */}
                {/* Event Image - Fixed height with object-cover */}
                <div className="relative h-48 overflow-hidden bg-black">
                    {/* Event Image - Fixed height with object-cover */}
                    <div className="relative h-48 overflow-hidden bg-black">
                        {event.image_url ? (
                            <img
                                src={event.image_url}
                                alt={event.name}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                loading="lazy"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : null}

                        {/* Fallback gradient when no image */}
                        <div className={`absolute inset-0 bg-gradient-to-br from-red-950 via-red-900/50 to-black ${event.image_url ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Trophy className="w-20 h-20 text-red-800/30" />
                            </div>
                        </div>

                        {/* Dark overlay for better text visibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />

                        {/* Subtle red glow overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Top Badges Row */}
                        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-20">
                            {/* Left Badge - Registration Status */}
                            {registrationStatus.status !== 'open' ? (
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full shadow-lg backdrop-blur-sm border ${registrationStatus.status === 'upcoming'
                                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                                        : 'bg-red-500/20 text-red-300 border-red-500/40'
                                    }`}>
                                    {registrationStatus.status === 'upcoming' ? (
                                        <><Clock className="w-3.5 h-3.5" /> Coming Soon</>
                                    ) : (
                                        <><Lock className="w-3.5 h-3.5" /> {registrationStatus.label}</>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-300 border border-green-500/40 text-xs font-bold rounded-full shadow-lg backdrop-blur-sm">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    Open
                                </div>
                            )}


                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                            {event.is_featured && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-yellow-600/90 text-white text-xs font-bold rounded-full shadow-lg z-10">
                                    <Star className="w-3 h-3 fill-current" />
                                    Featured
                                </div>
                            )}

                            <div className="absolute bottom-0 left-0 w-full p-3 z-10">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded">
                                        {event.category}
                                    </span>
                                    <span className="px-3 py-1.5 bg-black/70 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-medium rounded">
                                        {event.event_type === 'team' ? '👥 team' : '👤 solo'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-black to-red-950/10">
                            {/* Event Title */}
                            <h3 className="text-xl font-bold mb-3 text-white group-hover:text-red-400 transition-colors line-clamp-1" style={{ fontFamily: 'inherit' }}>
                                {event.name}
                            </h3>

                            {/* Event Details */}
                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex items-center gap-2 text-red-400/80">
                                    <Calendar className="w-4 h-4 flex-shrink-0 text-red-500" />
                                    {/* Content */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold mb-2 text-red-500 group-hover:text-red-400 transition-colors line-clamp-1">
                                            {event.name}
                                        </h3>

                                        {/* Content */}
                                        <div className="p-4 flex-1 flex flex-col">
                                            <h3 className="text-lg font-bold mb-2 text-red-500 group-hover:text-red-400 transition-colors line-clamp-1">
                                                {event.name}
                                            </h3>

                                            <div className="space-y-1.5 text-sm text-red-500/70 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 flex-shrink-0 text-red-600" />
                                                    <span>{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-red-400/80">
                                                    <MapPin className="w-4 h-4 flex-shrink-0 text-red-500" />
                                                    <span className="truncate">{event.venue}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-red-400/80">
                                                    <Users className="w-4 h-4 flex-shrink-0 text-red-500" />
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 flex-shrink-0 text-red-600" />
                                                        <span>{event.current_participants || 0}/{event.max_participants || '∞'} registered</span>
                                                    </div>
                                                </div>

                                                {/* Prize & Fee Cards */}
                                                <div className={`grid gap-3 mb-4 ${event.prize_pool && event.prize_pool > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                    {event.prize_pool && event.prize_pool > 0 && (
                                                        <div className="bg-gradient-to-br from-red-950/50 to-black border border-red-800/50 p-3 text-center rounded-lg">
                                                            <div className="text-red-500/70 text-[10px] uppercase tracking-widest font-medium">Prize Pool</div>
                                                            <div className="text-red-400 font-bold text-lg">₹{event.prize_pool?.toLocaleString()}</div>
                                                        </div>
                                                    )}
                                                    <div className={`bg-gradient-to-br from-red-950/50 to-black border p-3 text-center rounded-lg ${isFreeEvent ? 'border-green-700/50' : 'border-red-800/50'}`}>
                                                        <div className="text-red-500/70 text-[10px] uppercase tracking-widest font-medium">Entry Fee</div>
                                                        <div className={`font-bold text-lg ${isFreeEvent ? 'text-green-400' : 'text-red-400'}`}>
                                                            {/* Prize & Fee Row */}
                                                            {/* Prize & Fee Row */}
                                                            <div className={`grid gap-2 mb-3 ${event.prize_pool && event.prize_pool > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                                {event.prize_pool && event.prize_pool > 0 && (
                                                                    <div className="bg-black/50 border border-red-900/40 p-2 text-center rounded-lg">
                                                                        <div className="text-red-600/60 text-xs uppercase tracking-wider">Prize Pool</div>
                                                                        <div className="text-red-400 font-bold">₹{event.prize_pool?.toLocaleString()}</div>
                                                                    </div>
                                                                )}
                                                                <div className={`bg-black/50 border p-2 text-center rounded-lg ${isFreeEvent ? 'border-green-500/40' : 'border-red-900/40'}`}>
                                                                    <div className="text-red-600/60 text-xs uppercase tracking-wider">Entry Fee</div>
                                                                    <div className={`font-bold ${isFreeEvent ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {isFreeEvent ? '🎉 FREE' : `₹${event.registration_fee}`}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Action Buttons */}
                                                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                                                <Button
                                                                    onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                                                                    variant="outline"
                                                                    className="w-full border-red-700/60 text-red-400 hover:bg-red-950/60 hover:text-red-300 hover:border-red-600 transition-all py-2.5 rounded-lg"
                                                                >
                                                                    <Eye className="w-4 h-4 mr-2" />
                                                                    <span>Details</span>
                                                                </Button>

                                                                {registrationStatus.canRegister ? (
                                                                    <Button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onRegister(event.id, registrationStatus);
                                                                        }}
                                                                        className="w-full border-none shadow-lg transition-all py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-900/30 rounded-lg"
                                                                    >
                                                                        <span>Register</span><ChevronRight className="w-4 h-4 ml-1" />
                                                                    </Button>
                                                                ) : (
                                                                    /* Locked Button with Premium Styling */
                                                                    <div className="relative overflow-hidden rounded-lg">
                                                                        {/* Animated border glow */}
                                                                        <div className={`absolute inset-0 rounded-lg opacity-50 ${registrationStatus.status === 'upcoming'
                                                                                ? 'bg-gradient-to-r from-yellow-600/20 via-yellow-500/30 to-yellow-600/20'
                                                                                : 'bg-gradient-to-r from-red-600/20 via-red-500/30 to-red-600/20'
                                                                            }`} style={{ animation: 'pulse 2s infinite' }} />

                                                                        {/* Chain decoration */}
                                                                        <div className="absolute left-1 top-1/2 -translate-y-1/2 flex gap-0.5 z-10">
                                                                            {[...Array(2)].map((_, i) => (
                                                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${registrationStatus.status === 'upcoming' ? 'bg-yellow-500/60' : 'bg-red-500/60'} animate-pulse`} style={{ animationDelay: `${i * 0.2}s` }} />
                                                                            ))}
                                                                        </div>
                                                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 z-10">
                                                                            {[...Array(2)].map((_, i) => (
                                                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${registrationStatus.status === 'upcoming' ? 'bg-yellow-500/60' : 'bg-red-500/60'} animate-pulse`} style={{ animationDelay: `${i * 0.2 + 0.1}s` }} />
                                                                            ))}
                                                                        </div>

                                                                        <Button
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            disabled
                                                                            className={`w-full border shadow-lg transition-all py-2.5 relative rounded-lg ${registrationStatus.status === 'upcoming'
                                                                                    ? 'bg-gradient-to-r from-yellow-900/80 to-yellow-800/80 text-yellow-200 border-yellow-700/50'
                                                                                    : 'bg-gradient-to-r from-zinc-800 to-zinc-900 text-zinc-300 border-red-900/50'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center justify-center gap-1.5">
                                                                                <div style={{ animation: 'lockSwing 2s ease-in-out infinite' }}>
                                                                                    <Lock className={`w-3.5 h-3.5 ${registrationStatus.status === 'upcoming' ? 'text-yellow-400' : 'text-red-400'}`}
                                                                                        style={{ filter: `drop-shadow(0 0 6px ${registrationStatus.status === 'upcoming' ? 'rgba(234, 179, 8, 0.6)' : 'rgba(239, 68, 68, 0.6)'})` }}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-sm font-medium">{registrationStatus.label}</span>
                                                                            </div>
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Registration Status Message */}
                                                            {registrationStatus.status === 'upcoming' && (
                                                                <div className="mt-3 pt-3 border-t border-red-900/30 text-center text-xs text-yellow-500/90 flex items-center justify-center gap-1.5">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <Button
                                                                            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                                                                            variant="outline"
                                                                            className="w-full border-red-600/50 text-red-400 hover:bg-red-950/50 hover:text-red-300 py-2.5"
                                                                        >
                                                                            <Eye className="w-4 h-4 mr-1.5" />
                                                                            Details
                                                                        </Button>

                                                                        {registrationStatus.status === 'upcoming' ? (
                                                                            <ComingSoonCardButton />
                                                                        ) : (
                                                                            <Button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (registrationStatus.status === 'open') {
                                                                                        onRegister();
                                                                                    }
                                                                                }}
                                                                                disabled={registrationStatus.status === 'closed'}
                                                                                className={`w-full py-2.5 ${registrationStatus.status === 'open'
                                                                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20'
                                                                                        : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                                                                                    }`}
                                                                            >
                                                                                {registrationStatus.label}
                                                                                {registrationStatus.status === 'open' && <ChevronRight className="w-4 h-4 ml-1" />}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <Button
                                                                            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                                                                            variant="outline"
                                                                            className="w-full border-red-600/50 text-red-400 hover:bg-red-950/50 hover:text-red-300 py-2.5"
                                                                        >
                                                                            <Eye className="w-4 h-4 mr-1.5" />
                                                                            Details
                                                                        </Button>

                                                                        {registrationStatus.status === 'upcoming' ? (
                                                                            <ComingSoonCardButton />
                                                                        ) : (
                                                                            <Button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (registrationStatus.status === 'open') {
                                                                                        onRegister();
                                                                                    }
                                                                                }}
                                                                                disabled={registrationStatus.status === 'closed'}
                                                                                className={`w-full py-2.5 ${registrationStatus.status === 'open'
                                                                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20'
                                                                                        : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                                                                                    }`}
                                                                            >
                                                                                {registrationStatus.label}
                                                                                {registrationStatus.status === 'open' && <ChevronRight className="w-4 h-4 ml-1" />}
                                                                            </Button>
                                                                        )}
                                                                    </div>

                                                                    {/* Registration Opens Date */}
                                                                    {registrationStatus.status === 'upcoming' && registrationStatus.message && (
                                                                        <p className="text-xs text-yellow-500 text-center flex items-center justify-center gap-1 mt-2">
                                                                            <Clock className="w-3 h-3" />
                                                                            {registrationStatus.message}
                                                                        </p>
                                                                    )}
                                                                </div>
        </div>
                                                        );
}

                                                        function StatCard({label, value}: {label: string; value: string | number }) {
    return (
                                                        <div className="bg-black/50 border border-red-900/40 rounded-xl p-4 text-center">
                                                            <div className="text-2xl sm:text-3xl font-bold text-red-500">{value}</div>
                                                            <div className="text-red-400/60 text-sm">{label}</div>
                                                        </div>
                                                        );
}

                                                        // 3D Silver Chain Lock Animation Button for Coming Soon (Card Version)
                                                        function ComingSoonCardButton() {
    return (
                                                        <div className="relative group w-full h-[44px]">
                                                            {/* Outer Glow */}
                                                            <div className="absolute -inset-1 bg-gradient-to-r from-slate-400/30 via-zinc-300/40 to-slate-400/30 rounded-lg blur-md opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                                                            {/* Button Container */}
                                                            <button
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="relative w-full h-full bg-gradient-to-b from-zinc-800 via-zinc-900 to-black rounded-lg border border-zinc-600/50 overflow-hidden cursor-not-allowed"
                                                                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.5)' }}
                                                            >
                                                                {/* Metallic Shine */}
                                                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />

                                                                {/* Chain Container */}
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    {/* Left Silver Chain */}
                                                                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                                                                        <svg width="28" height="44" viewBox="0 0 28 44" className="animate-chain-swing-l drop-shadow-lg">
                                                                            <defs>
                                                                                <linearGradient id="silverGradL" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                                    <stop offset="0%" stopColor="#e8e8e8" />
                                                                                    <stop offset="30%" stopColor="#a8a8a8" />
                                                                                    <stop offset="50%" stopColor="#d0d0d0" />
                                                                                    <stop offset="70%" stopColor="#888888" />
                                                                                    <stop offset="100%" stopColor="#606060" />
                                                                                </linearGradient>
                                                                            </defs>
                                                                            {/* Chain Link 1 */}
                                                                            <ellipse cx="14" cy="8" rx="8" ry="5" fill="none" stroke="url(#silverGradL)" strokeWidth="3" />
                                                                            {/* Chain Link 2 - overlapping */}
                                                                            <ellipse cx="14" cy="15" rx="6" ry="4" fill="none" stroke="url(#silverGradL)" strokeWidth="3" />
                                                                            {/* Chain Link 3 */}
                                                                            <ellipse cx="14" cy="22" rx="8" ry="5" fill="none" stroke="url(#silverGradL)" strokeWidth="3" />
                                                                            {/* Chain Link 4 */}
                                                                            <ellipse cx="14" cy="29" rx="6" ry="4" fill="none" stroke="url(#silverGradL)" strokeWidth="3" />
                                                                            {/* Chain Link 5 */}
                                                                            <ellipse cx="14" cy="36" rx="8" ry="5" fill="none" stroke="url(#silverGradL)" strokeWidth="3" />
                                                                        </svg>
                                                                    </div>

                                                                    {/* Center Lock - 3D Design */}
                                                                    <div className="relative z-20 animate-lock-pulse">
                                                                        <svg width="32" height="38" viewBox="0 0 32 38" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                                                            <defs>
                                                                                <linearGradient id="lockBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                                    <stop offset="0%" stopColor="#ffd700" />
                                                                                    <stop offset="25%" stopColor="#ffec8b" />
                                                                                    <stop offset="50%" stopColor="#daa520" />
                                                                                    <stop offset="75%" stopColor="#b8860b" />
                                                                                    <stop offset="100%" stopColor="#8b6914" />
                                                                                </linearGradient>
                                                                                <linearGradient id="lockShackleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                                                    <stop offset="0%" stopColor="#c0c0c0" />
                                                                                    <stop offset="30%" stopColor="#e8e8e8" />
                                                                                    <stop offset="50%" stopColor="#ffffff" />
                                                                                    <stop offset="70%" stopColor="#c0c0c0" />
                                                                                    <stop offset="100%" stopColor="#808080" />
                                                                                </linearGradient>
                                                                                <filter id="innerShadow">
                                                                                    <feOffset dx="0" dy="1" />
                                                                                    <feGaussianBlur stdDeviation="1" result="offset-blur" />
                                                                                    <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                                                                                    <feFlood floodColor="black" floodOpacity="0.3" result="color" />
                                                                                    <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                                                                                    <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                                                                                </filter>
                                                                            </defs>

                                                                            {/* Shackle (the U-shaped part) */}
                                                                            <path
                                                                                d="M8 16 L8 10 C8 4 24 4 24 10 L24 16"
                                                                                fill="none"
                                                                                stroke="url(#lockShackleGrad)"
                                                                                strokeWidth="4"
                                                                                strokeLinecap="round"
                                                                            />

                                                                            {/* Lock Body */}
                                                                            <rect
                                                                                x="4" y="16"
                                                                                width="24" height="18"
                                                                                rx="3"
                                                                                fill="url(#lockBodyGrad)"
                                                                                filter="url(#innerShadow)"
                                                                            />

                                                                            {/* Keyhole */}
                                                                            <circle cx="16" cy="24" r="3" fill="#2a2a2a" />
                                                                            <rect x="14.5" y="24" width="3" height="6" fill="#2a2a2a" />

                                                                            {/* Highlight on lock body */}
                                                                            <rect x="6" y="18" width="8" height="2" rx="1" fill="rgba(255,255,255,0.3)" />
                                                                        </svg>
                                                                    </div>

                                                                    {/* Right Silver Chain */}
                                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                        <svg width="28" height="44" viewBox="0 0 28 44" className="animate-chain-swing-r drop-shadow-lg">
                                                                            <defs>
                                                                                <linearGradient id="silverGradR" x1="100%" y1="0%" x2="0%" y2="100%">
                                                                                    <stop offset="0%" stopColor="#e8e8e8" />
                                                                                    <stop offset="30%" stopColor="#a8a8a8" />
                                                                                    <stop offset="50%" stopColor="#d0d0d0" />
                                                                                    <stop offset="70%" stopColor="#888888" />
                                                                                    <stop offset="100%" stopColor="#606060" />
                                                                                </linearGradient>
                                                                            </defs>
                                                                            {/* Chain Links */}
                                                                            <ellipse cx="14" cy="8" rx="8" ry="5" fill="none" stroke="url(#silverGradR)" strokeWidth="3" />
                                                                            <ellipse cx="14" cy="15" rx="6" ry="4" fill="none" stroke="url(#silverGradR)" strokeWidth="3" />
                                                                            <ellipse cx="14" cy="22" rx="8" ry="5" fill="none" stroke="url(#silverGradR)" strokeWidth="3" />
                                                                            <ellipse cx="14" cy="29" rx="6" ry="4" fill="none" stroke="url(#silverGradR)" strokeWidth="3" />
                                                                            <ellipse cx="14" cy="36" rx="8" ry="5" fill="none" stroke="url(#silverGradR)" strokeWidth="3" />
                                                                        </svg>
                                                                    </div>
                                                                </div>

                                                                {/* Text */}
                                                                <div className="absolute bottom-1 left-0 right-0 text-center">
                                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                                        Coming Soon
                                                                    </span>
                                                                </div>
                                                            </button>

                                                            {/* Animations */}
                                                            <style>{`
                @keyframes chain-swing-l {
                    0%, 100% { transform: translateY(-50%) rotate(-8deg) translateX(-2px); }
                    50% { transform: translateY(-50%) rotate(8deg) translateX(2px); }
                }
                @keyframes chain-swing-r {
                    0%, 100% { transform: translateY(-50%) rotate(8deg) translateX(2px); }
                    50% { transform: translateY(-50%) rotate(-8deg) translateX(-2px); }
                }
                @keyframes lock-pulse {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(255,215,0,0.4)); }
                    50% { transform: scale(1.05); filter: drop-shadow(0 0 8px rgba(255,215,0,0.6)); }
                }
                .animate-chain-swing-l {
                    animation: chain-swing-l 2.5s ease-in-out infinite;
                }
                .animate-chain-swing-r {
                    animation: chain-swing-r 2.5s ease-in-out infinite;
                }
                .animate-lock-pulse {
                    animation: lock-pulse 2s ease-in-out infinite;
                }
            `}</style>
                                                        </div>
                                                        );
}
