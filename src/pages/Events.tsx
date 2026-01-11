import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, MapPin, Users, ChevronRight, Star, Trophy, AlertCircle, RefreshCw, Skull, Ghost, Flame, Eye, Clock, Lock, AlertTriangle } from 'lucide-react';
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
            try {
                const { data: festData } = await (supabase.from('fest_settings' as any) as any).select('global_button_action').single();
                if (festData?.global_button_action) {
                    setGlobalButtonAction(festData.global_button_action);
                }
            } catch (festError) {
                console.warn('Could not fetch fest settings:', festError);
                // Non-critical, continue
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
        const cats = [...new Set(events.map(e => e.category || 'Uncategorized'))].filter(Boolean);
        return ['all', ...cats];
    }, [events]);

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesSearch = (event.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (event.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (event.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || (event.category || 'Uncategorized') === selectedCategory;
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
                                onViewDetails={() => handleViewDetails(event.id)}
                                onRegister={handleRegister}
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
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full shadow-lg backdrop-blur-sm border ${
                            registrationStatus.status === 'upcoming' 
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

                    {/* Right Badge - Featured */}
                    {event.is_featured && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white text-xs font-bold rounded-full shadow-lg">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            Featured
                        </div>
                    )}
                </div>

                {/* Bottom Badges - Category & Type */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-20">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded shadow-lg">
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
                        <span>{new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-400/80">
                        <MapPin className="w-4 h-4 flex-shrink-0 text-red-500" />
                        <span className="truncate">{event.venue}</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-400/80">
                        <Users className="w-4 h-4 flex-shrink-0 text-red-500" />
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
                            <div className={`absolute inset-0 rounded-lg opacity-50 ${
                                registrationStatus.status === 'upcoming' 
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
                                className={`w-full border shadow-lg transition-all py-2.5 relative rounded-lg ${
                                    registrationStatus.status === 'upcoming'
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
                        {registrationStatus.message}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="bg-black/50 border border-red-900/40 rounded-xl p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-500">{value}</div>
            <div className="text-red-400/60 text-sm">{label}</div>
        </div>
    );
}
