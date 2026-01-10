import React, { useEffect, useState, useMemo } from 'react';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    ArrowLeft, Calendar, MapPin, Users, Trophy, DollarSign, Info, CheckCircle, 
    User, Clock, QrCode, Share2, Lock, AlertCircle, ExternalLink
=======
=======
>>>>>>> Stashed changes
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, MapPin, Users, Trophy, DollarSign, Info, 
  CheckCircle, User, Clock, Zap, Star, Lock, Flame, Ghost, Gamepad2
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import { generateUpiQrCodeUrl, isValidUpiId } from '@/utils/upiQrGenerator';
import { SEOHead } from '@/components/SEOHead';
import { GlobalRegisterButton } from '@/components/GlobalRegisterButton';
import { toast } from 'sonner';

interface Event {
    id: string;
    name: string;
    description: string;
    category: string;
    event_type: string;
    max_team_size: number;
    min_team_size: number;
    registration_fee: number;
    prize_pool: number;
    venue: string;
    event_date: string;
    registration_deadline: string;
    max_participants: number;
    current_participants: number;
    image_url: string;
    rules: string[];
    coordinators: string[];
    is_featured: boolean;
    status: string;
    registration_start_date?: string;
    registration_end_date?: string;
    upi_qr_url?: string;
    upi_id?: string;
}

type RegistrationStatusType = 'loading' | 'upcoming' | 'open' | 'closed' | 'ended';

interface RegistrationStatus {
    status: RegistrationStatusType;
    label: string;
    message: string;
    canRegister: boolean;
}

export default function EventDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPaymentQr, setShowPaymentQr] = useState(false);
    const [globalButtonAction, setGlobalButtonAction] = useState<string>('fest_registration');

    const registrationStatus = useMemo((): RegistrationStatus => {
        if (!event) return { status: 'loading', label: 'Loading...', message: '', canRegister: false };
        
        const now = new Date();
        
        // Check if registration hasn't started yet
        if (event.registration_start_date && new Date(event.registration_start_date) > now) {
            const startDate = new Date(event.registration_start_date);
            return { 
                status: 'upcoming', 
                label: 'Coming Soon',
                message: `Registration opens on ${startDate.toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: 'numeric', 
                    minute: 'numeric', 
                    hour12: true 
                })}`,
                canRegister: false
            };
        }
        
        // Check if registration has ended
        if (event.registration_end_date && new Date(event.registration_end_date) < now) {
            return { status: 'closed', label: 'Registration Closed', message: 'Registration has ended for this event', canRegister: false };
        }
        
        // Check registration deadline
        if (event.registration_deadline && new Date(event.registration_deadline) < now) {
            return { status: 'closed', label: 'Deadline Passed', message: 'Registration deadline has passed', canRegister: false };
        }
        
        // Check if event is in the past
        if (event.event_date && new Date(event.event_date) < now) {
            return { status: 'ended', label: 'Event Ended', message: 'This event has already taken place', canRegister: false };
        }
        
        // Check if event is full
        if (event.max_participants > 0 && event.current_participants >= event.max_participants) {
            return { status: 'closed', label: 'Registrations Full', message: 'Maximum participants reached', canRegister: false };
        }
        
        return { status: 'open', label: 'Register Now', message: 'Registration is open', canRegister: true };
    }, [event]);

    // Get UPI QR code URL - either uploaded or auto-generated
    const upiQrCodeUrl = useMemo(() => {
        if (!event || event.registration_fee === 0) return null;
        
        // First priority: uploaded QR code
        if (event.upi_qr_url) return event.upi_qr_url;
        
        // Second priority: auto-generated from UPI ID
        if (event.upi_id && isValidUpiId(event.upi_id)) {
            return generateUpiQrCodeUrl(event.upi_id, event.registration_fee, undefined, event.name);
        }
        
        return null;
    }, [event]);

    const isPaidEvent = event && event.registration_fee > 0;

    useEffect(() => {
        const fetchEventDetails = async () => {
            if (!id) {
                setError('Event not found');
                setLoading(false);
                return;
            }
            
            setLoading(true);
            setError(null);
            
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                
                if (!data) {
                    setError('Event not found');
                } else {
                    setEvent(data);
                }

                // Fetch fest settings for global button action
                const { data: festData } = await (supabase.from('fest_settings' as any) as any)
                    .select('global_button_action')
                    .single();
                if (festData?.global_button_action) {
                    setGlobalButtonAction(festData.global_button_action);
                }
            } catch (err: unknown) {
                console.error('Error fetching event details:', err);
                setError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetails();
        // Scroll to top on mount
        window.scrollTo(0, 0);
    }, [id]);

    const handleRegister = () => {
        if (!registrationStatus.canRegister) {
            toast.error(registrationStatus.message || 'Registration is not available');
            return;
        }
        
        if (globalButtonAction === 'fest_registration') {
            navigate('/fest-registration');
        } else {
            navigate('/register', { state: { selectedEvent: event?.id } });
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: event?.name || 'KAIZEN Event',
            text: `Check out ${event?.name} at KAIZEN 2026!`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const getStatusBadgeStyles = () => {
        switch (registrationStatus.status) {
            case 'open':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'upcoming':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'closed':
            case 'ended':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white">
                <SEOHead title="Loading Event... - KAIZEN 2026" />
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <Skeleton className="w-full h-64 md:h-96 rounded-2xl bg-red-900/20 mb-8" />
                    <Skeleton className="w-3/4 h-10 bg-red-900/20 mb-4" />
                    <Skeleton className="w-1/2 h-6 bg-red-900/10 mb-8" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-24 bg-red-900/10 rounded-xl" />
                        ))}
                    </div>
                    <Skeleton className="w-full h-40 bg-red-900/10 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <SEOHead title="Event Not Found - KAIZEN 2026" />
                <div className="text-center p-8">
                    <Alert variant="destructive" className="bg-red-950/20 border-red-900/50 text-red-200 mb-6 max-w-md">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error || 'Event not found'}</AlertDescription>
                    </Alert>
                    <Button onClick={() => navigate('/events')} variant="outline" className="border-red-500 text-red-500 hover:bg-red-950">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Events
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <SEOHead 
                title={`${event.name} - KAIZEN 2026`}
                description={event.description}
            />

            {/* Background */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-red-950/10 to-black" />
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        background: 'radial-gradient(ellipse at center top, rgba(139, 0, 0, 0.4) 0%, transparent 60%)'
                    }}
                />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-[60] bg-black/95 backdrop-blur-sm border-b border-red-900/50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <Link
                        to="/events"
                        className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Back to Events</span>
                    </Link>
                    <Link to="/" className="text-xl sm:text-2xl font-bold text-red-500" style={{ fontFamily: 'Cinzel, serif' }}>
                        KAIZEN RITP
                    </Link>
                    <GlobalRegisterButton className="text-sm" />
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Hero Image - Full quality, no cropping */}
                <div className="relative w-full rounded-2xl overflow-hidden bg-black mb-8">
                    {event.image_url ? (
                        <img 
                            src={event.image_url} 
                            alt={event.name} 
                            className="w-full h-auto object-contain mx-auto"
                            style={{ maxHeight: '80vh' }}
                        />
                    ) : (
                        <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-red-950 to-black">
                            <Trophy className="w-24 h-24 text-red-900/30" />
                        </div>
                    )}
                    
                    {/* Featured Badge */}
                    {event.is_featured && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 bg-yellow-600/90 text-white text-sm font-bold rounded-full shadow-lg backdrop-blur-sm z-10">
                            <Trophy className="w-4 h-4 fill-current" />
                            Featured Event
                        </div>
                    )}
                </div>

                {/* Event Title & Category */}
                <div className="mb-6">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded">
                            {event.category}
                        </span>
                        <span className="px-3 py-1 bg-black/60 border border-red-900/50 text-red-400 text-xs rounded">
                            {event.event_type === 'team' ? '👥 Team Event' : '👤 Individual'}
                        </span>
                        <span className={`px-3 py-1 text-xs font-semibold rounded border ${getStatusBadgeStyles()}`}>
                            {registrationStatus.label}
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2" 
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                        {event.name}
                    </h1>
                </div>

                {/* Registration Status Banner */}
                {!registrationStatus.canRegister && registrationStatus.status !== 'loading' && (
                    <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
                        registrationStatus.status === 'upcoming' 
                            ? 'bg-yellow-500/10 border-yellow-500/30' 
                            : 'bg-red-500/10 border-red-500/30'
                    }`}>
                        {registrationStatus.status === 'upcoming' ? (
                            <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                        ) : (
                            <Lock className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <div>
                            <p className={`font-semibold ${
                                registrationStatus.status === 'upcoming' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                                {registrationStatus.label}
                            </p>
                            <p className="text-sm text-white/70">{registrationStatus.message}</p>
                        </div>
                    </div>
                )}

                {/* Key Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <Calendar className="w-5 h-5 text-red-500 mb-2" />
                        <div className="text-xs text-white/50 uppercase">Date & Time</div>
                        <div className="text-sm font-medium text-white">
                            {new Date(event.event_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </div>
                        <div className="text-xs text-white/60">
                            {new Date(event.event_date).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            })}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <MapPin className="w-5 h-5 text-red-500 mb-2" />
                        <div className="text-xs text-white/50 uppercase">Venue</div>
                        <div className="text-sm font-medium text-white">{event.venue}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <DollarSign className="w-5 h-5 text-red-500 mb-2" />
                        <div className="text-xs text-white/50 uppercase">Entry Fee</div>
                        <div className={`text-sm font-medium ${event.registration_fee === 0 ? 'text-green-400' : 'text-white'}`}>
                            {event.registration_fee === 0 ? '🎉 FREE' : `₹${event.registration_fee}`}
                        </div>
                    </div>
                    {event.prize_pool && event.prize_pool > 0 && (
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                            <Trophy className="w-5 h-5 text-yellow-500 mb-2" />
                            <div className="text-xs text-white/50 uppercase">Prize Pool</div>
                            <div className="text-sm font-medium text-yellow-400">₹{event.prize_pool?.toLocaleString()}</div>
                        </div>
                    )}
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                        <Users className="w-5 h-5 text-red-500 mb-2" />
                        <div className="text-xs text-white/50 uppercase">Participants</div>
                        <div className="text-sm font-medium text-white">
                            {event.current_participants || 0}/{event.max_participants || '∞'}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    {registrationStatus.canRegister ? (
                        <Button 
                            onClick={handleRegister}
                            className="flex-1 py-6 text-lg font-semibold transition-all bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-900/30"
                        >
                            Register Now
                        </Button>
                    ) : (
                        /* Locked Button with Chain Animation */
                        <div className="flex-1 relative overflow-hidden rounded-lg">
                            {/* Chain background pattern */}
                            <div className="absolute inset-0 pointer-events-none">
                                <svg className="absolute top-0 left-0 w-full h-full opacity-20" preserveAspectRatio="none">
                                    <defs>
                                        <pattern id="chainPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                            <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none" className="text-red-500" />
                                            <circle cx="30" cy="30" r="6" stroke="currentColor" strokeWidth="2" fill="none" className="text-red-500" />
                                            <line x1="16" y1="10" x2="24" y2="30" stroke="currentColor" strokeWidth="2" className="text-red-500" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#chainPattern)" />
                                </svg>
                                {/* Animated chains on sides */}
                                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-center items-center gap-1">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="w-4 h-4 rounded-full border-2 border-red-500/40 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                                    ))}
                                </div>
                                <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-center items-center gap-1">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="w-4 h-4 rounded-full border-2 border-red-500/40 animate-pulse" style={{ animationDelay: `${i * 0.2 + 0.1}s` }} />
                                    ))}
                                </div>
                            </div>
                            
                            <Button 
                                disabled
                                className={`w-full py-6 text-lg font-semibold relative z-10 ${
                                    registrationStatus.status === 'upcoming'
                                        ? 'bg-gradient-to-r from-yellow-900/80 to-yellow-800/80 text-yellow-300 border border-yellow-600/50'
                                        : 'bg-gradient-to-r from-gray-800 to-gray-900 text-gray-300 border border-red-900/50'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-3">
                                    {/* 3D Animated Lock */}
                                    <div 
                                        className="relative"
                                        style={{ 
                                            animation: 'lockSwing 2s ease-in-out infinite',
                                            transformStyle: 'preserve-3d'
                                        }}
                                    >
                                        <Lock className={`w-6 h-6 ${
                                            registrationStatus.status === 'upcoming' ? 'text-yellow-400' : 'text-red-400'
                                        }`} style={{ filter: `drop-shadow(0 0 8px ${registrationStatus.status === 'upcoming' ? 'rgba(234, 179, 8, 0.5)' : 'rgba(239, 68, 68, 0.5)'})` }} />
                                    </div>
                                    <span>{registrationStatus.label}</span>
                                </div>
                            </Button>
                        </div>
                    )}
                    <Button 
                        onClick={handleShare}
                        variant="outline"
                        className="sm:w-auto border-white/20 text-white hover:bg-white/10 py-6 px-8"
                    >
                        <Share2 className="w-5 h-5 mr-2" />
                        Share
                    </Button>
                </div>

                {/* Description */}
                <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5" /> About This Event
                    </h2>
                    <p className="text-white/80 leading-relaxed text-lg whitespace-pre-wrap">
                        {event.description}
                    </p>
                </div>

                {/* Team Info */}
                {event.event_type === 'team' && (
                    <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-6 mb-8">
                        <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5" /> Team Requirements
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/30 p-4 rounded-lg">
                                <div className="text-sm text-blue-300/70">Minimum Team Size</div>
                                <div className="text-2xl font-bold text-white">{event.min_team_size || 1}</div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-lg">
                                <div className="text-sm text-blue-300/70">Maximum Team Size</div>
                                <div className="text-2xl font-bold text-white">{event.max_team_size || '∞'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rules */}
                {event.rules && event.rules.length > 0 && (
                    <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mb-8">
                        <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" /> Rules & Guidelines
                        </h2>
                        <ul className="space-y-3">
                            {event.rules.map((rule, index) => (
                                <li key={index} className="flex items-start gap-3 text-white/70">
                                    <span className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                                        {index + 1}
                                    </span>
                                    <span className="pt-0.5">{rule}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Coordinators */}
                {event.coordinators && event.coordinators.length > 0 && (
                    <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mb-8">
                        <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5" /> Event Coordinators
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {event.coordinators.map((coordinator, index) => (
                                <div key={index} className="bg-black/30 border border-white/5 p-4 rounded-lg flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-red-500 font-bold">
                                        {coordinator.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-white/80">{coordinator}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* UPI Payment Section - For Paid Events with Open Registration */}
                {isPaidEvent && upiQrCodeUrl && registrationStatus.canRegister && (
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                                <QrCode className="w-5 h-5" /> Payment Information
                            </h2>
                            <button 
                                onClick={() => setShowPaymentQr(!showPaymentQr)}
                                className="text-sm text-yellow-400 hover:text-yellow-300 underline"
                            >
                                {showPaymentQr ? 'Hide QR Code' : 'Show QR Code'}
                            </button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                            <div className="flex-1 space-y-3">
                                <p className="text-white/80">
                                    <span className="text-gray-400">Registration Fee:</span>{' '}
                                    <span className="text-2xl font-bold text-green-400">₹{event.registration_fee}</span>
                                </p>
                                {event.upi_id && (
                                    <p className="text-white/80">
                                        <span className="text-gray-400">UPI ID:</span>{' '}
                                        <span className="font-mono text-yellow-300 select-all">{event.upi_id}</span>
                                    </p>
                                )}
                                <p className="text-sm text-gray-500 mt-2">
                                    Scan the QR code to pay. After payment, click "Register Now" to complete registration with your payment proof.
                                </p>
                            </div>
                            
                            {showPaymentQr && (
                                <div className="bg-white p-4 rounded-lg shadow-lg">
                                    <img 
                                        src={upiQrCodeUrl} 
                                        alt="Payment QR Code" 
                                        className="w-48 h-48 object-contain"
                                    />
                                    <p className="text-center text-xs text-gray-800 mt-2 font-medium">
                                        Scan to pay ₹{event.registration_fee}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bottom CTA */}
                <div className="bg-gradient-to-r from-red-950/50 to-black border border-red-900/30 rounded-xl p-6 text-center">
                    <p className="text-white/70 mb-4">
                        {registrationStatus.canRegister 
                            ? "Ready to participate? Register now and be part of KAIZEN 2026!"
                            : registrationStatus.message}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button 
                            onClick={handleRegister}
                            disabled={!registrationStatus.canRegister}
                            className={`px-8 py-3 ${
                                registrationStatus.canRegister
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {registrationStatus.canRegister ? 'Register Now' : registrationStatus.label}
                        </Button>
                        <Button 
                            onClick={() => navigate('/events')}
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Events
                        </Button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-red-900/30 py-8 mt-12">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <p className="text-red-500/40 text-xs">
                        © 2026 KAIZEN RITP. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
=======
=======
>>>>>>> Stashed changes
import { GlobalRegisterButton } from '@/components/GlobalRegisterButton';

// E-Sports Games Configuration
const ESPORTS_GAMES: Record<string, { name: string; image: string; color: string }> = {
    valorant: { name: 'Valorant', image: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/80eb7ecc9bf36b8a5d215c5b01c93b4b32c5c263-1920x1080.jpg', color: 'from-red-500 to-red-700' },
    freefire: { name: 'Free Fire', image: 'https://staticg.sportskeeda.com/editor/2022/05/c461c-16533606193095-1920.jpg', color: 'from-orange-500 to-yellow-600' },
    bgmi: { name: 'BGMI', image: 'https://staticg.sportskeeda.com/editor/2022/07/dfe94-16580991729498-1920.jpg', color: 'from-yellow-500 to-amber-600' },
};

interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  event_type: string;
  max_team_size: number;
  min_team_size: number;
  registration_fee: number;
  prize_pool: number;
  venue: string;
  event_date: string;
  registration_deadline: string;
  max_participants: number;
  current_participants: number;
  image_url: string;
  rules: string[];
  coordinators: string[];
  is_featured: boolean;
  status: string;
  registration_start_date?: string;
  registration_end_date?: string;
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('game');
  const selectedGame = gameId ? ESPORTS_GAMES[gameId] : null;
  
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalButtonAction, setGlobalButtonAction] = useState<string>('fest_registration');

  const registrationStatus = useMemo(() => {
    if (!event) return { status: 'loading', label: 'Loading...', message: '' };
    
    const now = new Date();
    
    // Check if registration hasn't started yet
    if (event.registration_start_date && new Date(event.registration_start_date) > now) {
        return { 
            status: 'upcoming', 
            label: 'Coming Soon',
            message: `Registration opens on ${new Date(event.registration_start_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}` 
        };
    }
    
    // Check if registration has ended
    if (event.registration_end_date && new Date(event.registration_end_date) < now) {
        return { status: 'closed', label: 'Closed', message: 'Registration Closed' };
    }
    
    // Check registration deadline
    if (event.registration_deadline && new Date(event.registration_deadline) < now) {
        return { status: 'closed', label: 'Closed', message: 'Registration Deadline Passed' };
    }
    
    // Check if event is in the past
    if (event.event_date && new Date(event.event_date) < now) {
        return { status: 'closed', label: 'Event Ended', message: 'This event has ended' };
    }
    
    return { status: 'open', label: 'Register Now', message: 'Register Now' };
  }, [event]);

  const isPaidEvent = event && event.registration_fee > 0;

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setEvent(data);
      } catch (err: unknown) {
        console.error('Error fetching event details:', err);
        setError('Failed to load event details.');
      } finally {
        setLoading(false);
      }
    };

    // Fetch global button action setting
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'global_button_action')
          .single();
        if (data?.value) {
          setGlobalButtonAction(String(JSON.parse(String(data.value))));
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchEventDetails();
    fetchSettings();
  }, [id]);

  const handleRegister = () => {
    if (!event) return;
    
    if (globalButtonAction === 'fest_registration') {
      navigate('/fest-registration');
    } else {
      navigate('/register', { state: { selectedEvent: event.id } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="w-full h-[50vh] rounded-xl bg-red-900/20" />
          <Skeleton className="w-3/4 h-12 bg-red-900/20" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 bg-red-900/10" />
            <Skeleton className="h-24 bg-red-900/10" />
          </div>
          <Skeleton className="w-full h-40 bg-red-900/10" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="bg-red-950/20 border-red-900/50 text-red-200 mb-6 max-w-md">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Event not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/events')} variant="outline" className="border-red-500 text-red-500 hover:bg-red-950">
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-red-950/10 to-black" />
        <div className="absolute inset-0 opacity-20">
          {[...Array(20)].map((_, i) => (
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
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-red-900/30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Events</span>
          </button>
          
          <Link to="/" className="text-xl font-bold text-red-500" style={{ fontFamily: 'Cinzel, serif' }}>
            KAIZEN RITP
          </Link>
          
          <GlobalRegisterButton className="text-sm" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto pb-24">
        {/* Selected Game Banner (for E-Sports events) */}
        {selectedGame && (
          <div className="relative w-full h-32 sm:h-40 overflow-hidden">
            <img 
              src={selectedGame.image} 
              alt={selectedGame.name}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${selectedGame.color} opacity-60`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wider">Selected Game</p>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedGame.name}</h2>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Poster - Centered, Medium size, No frame */}
        {event.image_url && (
          <div className="px-4 sm:px-6 pt-4">
            <div className="max-w-sm mx-auto overflow-hidden rounded-lg">
              <img 
                src={event.image_url} 
                alt={event.name} 
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        {/* Event Header */}
        <div className="px-4 sm:px-6 pt-6 space-y-4">
          {/* Category & Type Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded">
              {event.category}
            </span>
            {selectedGame && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1">
                <Gamepad2 className="w-3 h-3" />
                {selectedGame.name}
              </span>
            )}
            <span className="px-3 py-1.5 bg-black/80 border border-red-900/50 text-red-400 text-xs rounded">
              {event.event_type === 'team' ? 'Team Event' : 'Individual'}
            </span>
            {event.is_featured && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600/90 text-white text-xs font-bold rounded">
                <Star className="w-3 h-3 fill-current" />
                Featured
              </span>
            )}
          </div>

          {/* Event Name */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
            {selectedGame ? `${event.name} - ${selectedGame.name}` : event.name}
          </h1>
        </div>

        {/* Details Grid */}
        <div className="px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl">
              <Calendar className="w-5 h-5 text-red-500 mb-2" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Date</p>
              <p className="text-sm font-medium text-white">
                {new Date(event.event_date).toLocaleDateString('en-US', { 
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl">
              <MapPin className="w-5 h-5 text-red-500 mb-2" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Venue</p>
              <p className="text-sm font-medium text-white">{event.venue}</p>
            </div>
            
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl">
              <DollarSign className="w-5 h-5 text-red-500 mb-2" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Entry Fee</p>
              <p className={`text-sm font-bold ${event.registration_fee === 0 ? 'text-green-400' : 'text-white'}`}>
                {event.registration_fee === 0 ? '🎉 FREE' : `₹${event.registration_fee}`}
              </p>
            </div>
            
            {event.prize_pool && event.prize_pool > 0 && (
              <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl">
                <Trophy className="w-5 h-5 text-yellow-500 mb-2" />
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Prize Pool</p>
                <p className="text-sm font-bold text-yellow-400">₹{event.prize_pool?.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* About Event */}
        <div className="px-4 sm:px-6 space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
            <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5" /> About Event
            </h3>
            <p className="text-white/80 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
              {event.description}
            </p>
          </div>

          {/* Rules */}
          {event.rules && event.rules.length > 0 && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Rules & Guidelines
              </h3>
              <ul className="space-y-2">
                {event.rules.map((rule, index) => (
                  <li key={index} className="flex items-start gap-3 text-white/70 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coordinators */}
          {event.coordinators && event.coordinators.length > 0 && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5">
              <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" /> Coordinators
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {event.coordinators.map((coordinator, index) => (
                  <div key={index} className="bg-black/50 border border-white/10 p-3 rounded-lg flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center text-red-500 font-bold text-sm">
                      {coordinator.charAt(0)}
                    </div>
                    <span className="text-white/80 text-sm">{coordinator}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paid Event Notice */}
          {isPaidEvent && registrationStatus.status === 'open' && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-5">
              <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2 mb-3">
                <DollarSign className="w-5 h-5" /> Paid Event Registration
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/10">
                  <span className="text-gray-400">Registration Fee</span>
                  <span className="text-xl font-bold text-green-400">₹{event.registration_fee}</span>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-600/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-full flex-shrink-0">
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-yellow-400">First Come, First Serve</h4>
                      <p className="text-sm text-white/70 leading-relaxed">
                        Register now to secure your spot! After registration, we will contact you shortly via email with the payment link.
                      </p>
                      <p className="text-xs text-yellow-500/80 font-medium">
                        🎯 Our motto: Give every student a fair chance with proper time to register!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-red-900/30 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            {/* Status Message */}
            <div className="flex-1">
              {registrationStatus.status === 'upcoming' && (
                <div className="text-yellow-500/80 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">{registrationStatus.message}</span>
                  <span className="sm:hidden">Coming Soon</span>
                </div>
              )}
              {registrationStatus.status === 'closed' && (
                <div className="text-red-400/80 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {registrationStatus.message}
                </div>
              )}
              {registrationStatus.status === 'open' && (
                <div className="text-green-400/80 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{event.current_participants || 0}/{event.max_participants || '∞'} registered</span>
                </div>
              )}
            </div>

            {/* Register Button */}
            {registrationStatus.status === 'upcoming' ? (
              <ComingSoonButton message={registrationStatus.message} />
            ) : (
              <Button
                onClick={handleRegister}
                disabled={registrationStatus.status !== 'open'}
                className={`px-6 sm:px-8 py-3 text-base font-bold ${
                  registrationStatus.status === 'open'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30'
                    : 'bg-gray-800 text-gray-400 cursor-not-allowed'
                }`}
              >
                {registrationStatus.label}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// 3D Silver Chain Lock Animation Button for Coming Soon
function ComingSoonButton({ message }: { message: string }) {
  return (
    <div className="relative group">
      {/* Outer Glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-slate-400/30 via-zinc-300/50 to-slate-400/30 rounded-xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
      
      {/* Button Container */}
      <div 
        className="relative px-8 py-4 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black rounded-xl border border-zinc-600/50 overflow-hidden cursor-not-allowed"
        style={{ boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.5)' }}
      >
        {/* Metallic Shine */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
        
        {/* Chain Container */}
        <div className="absolute inset-0 flex items-center justify-between px-4">
          {/* Left Silver Chain */}
          <svg width="36" height="70" viewBox="0 0 36 70" className="animate-chain-swing-l drop-shadow-xl opacity-80">
            <defs>
              <linearGradient id="silverChainL" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f0f0f0" />
                <stop offset="25%" stopColor="#b8b8b8" />
                <stop offset="50%" stopColor="#e0e0e0" />
                <stop offset="75%" stopColor="#909090" />
                <stop offset="100%" stopColor="#686868" />
              </linearGradient>
            </defs>
            {/* Chain Links with 3D appearance */}
            <ellipse cx="18" cy="10" rx="10" ry="6" fill="none" stroke="url(#silverChainL)" strokeWidth="4" />
            <ellipse cx="18" cy="21" rx="8" ry="5" fill="none" stroke="url(#silverChainL)" strokeWidth="4" />
            <ellipse cx="18" cy="32" rx="10" ry="6" fill="none" stroke="url(#silverChainL)" strokeWidth="4" />
            <ellipse cx="18" cy="43" rx="8" ry="5" fill="none" stroke="url(#silverChainL)" strokeWidth="4" />
            <ellipse cx="18" cy="54" rx="10" ry="6" fill="none" stroke="url(#silverChainL)" strokeWidth="4" />
          </svg>
          
          {/* Right Silver Chain */}
          <svg width="36" height="70" viewBox="0 0 36 70" className="animate-chain-swing-r drop-shadow-xl opacity-80">
            <defs>
              <linearGradient id="silverChainR" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f0f0f0" />
                <stop offset="25%" stopColor="#b8b8b8" />
                <stop offset="50%" stopColor="#e0e0e0" />
                <stop offset="75%" stopColor="#909090" />
                <stop offset="100%" stopColor="#686868" />
              </linearGradient>
            </defs>
            <ellipse cx="18" cy="10" rx="10" ry="6" fill="none" stroke="url(#silverChainR)" strokeWidth="4" />
            <ellipse cx="18" cy="21" rx="8" ry="5" fill="none" stroke="url(#silverChainR)" strokeWidth="4" />
            <ellipse cx="18" cy="32" rx="10" ry="6" fill="none" stroke="url(#silverChainR)" strokeWidth="4" />
            <ellipse cx="18" cy="43" rx="8" ry="5" fill="none" stroke="url(#silverChainR)" strokeWidth="4" />
            <ellipse cx="18" cy="54" rx="10" ry="6" fill="none" stroke="url(#silverChainR)" strokeWidth="4" />
          </svg>
        </div>
        
        {/* Center Content */}
        <div className="relative flex items-center justify-center gap-4 z-10">
          {/* 3D Lock */}
          <div className="animate-lock-pulse">
            <svg width="42" height="50" viewBox="0 0 42 50" className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
              <defs>
                <linearGradient id="lockGoldBody" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="20%" stopColor="#ffec8b" />
                  <stop offset="50%" stopColor="#daa520" />
                  <stop offset="80%" stopColor="#b8860b" />
                  <stop offset="100%" stopColor="#8b6914" />
                </linearGradient>
                <linearGradient id="lockSilverShackle" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#c0c0c0" />
                  <stop offset="25%" stopColor="#e8e8e8" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="75%" stopColor="#c0c0c0" />
                  <stop offset="100%" stopColor="#808080" />
                </linearGradient>
                <filter id="lockInnerShadow">
                  <feOffset dx="0" dy="2" />
                  <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                  <feFlood floodColor="black" floodOpacity="0.4" result="color" />
                  <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                  <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                </filter>
              </defs>
              
              {/* Shackle */}
              <path 
                d="M11 22 L11 14 C11 6 31 6 31 14 L31 22" 
                fill="none" 
                stroke="url(#lockSilverShackle)" 
                strokeWidth="5" 
                strokeLinecap="round"
              />
              
              {/* Lock Body */}
              <rect 
                x="6" y="22" 
                width="30" height="24" 
                rx="4" 
                fill="url(#lockGoldBody)" 
                filter="url(#lockInnerShadow)"
              />
              
              {/* Keyhole */}
              <circle cx="21" cy="32" r="4" fill="#1a1a1a" />
              <rect x="19" y="32" width="4" height="9" fill="#1a1a1a" rx="1" />
              
              {/* Highlight on lock body */}
              <rect x="9" y="25" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
            </svg>
          </div>
          
          <div className="flex flex-col">
            <span className="font-bold text-lg text-zinc-300 tracking-wide">
              Coming Soon
            </span>
            {message && (
              <span className="text-xs text-zinc-500">{message}</span>
            )}
          </div>
        </div>
        
        {/* Shine sweep effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
      
      {/* Custom Styles */}
      <style>{`
        @keyframes chain-swing-l {
          0%, 100% { transform: rotate(-10deg) translateX(-4px); }
          50% { transform: rotate(10deg) translateX(4px); }
        }
        @keyframes chain-swing-r {
          0%, 100% { transform: rotate(10deg) translateX(4px); }
          50% { transform: rotate(-10deg) translateX(-4px); }
        }
        @keyframes lock-pulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(255,215,0,0.4)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 12px rgba(255,215,0,0.6)); }
        }
        .animate-chain-swing-l {
          animation: chain-swing-l 3s ease-in-out infinite;
        }
        .animate-chain-swing-r {
          animation: chain-swing-r 3s ease-in-out infinite;
        }
        .animate-lock-pulse {
          animation: lock-pulse 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
}
