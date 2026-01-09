import { useState } from 'react';
import { Search, CheckCircle, Clock, XCircle, Mail, Phone, Calendar, Trophy, X, QrCode, ChevronDown, ChevronUp, Ticket, Building, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QRPassGenerator } from './QRPassGenerator';
import { FestPassGenerator } from './FestPassGenerator';

interface Registration {
    id: string;
    created_at: string;
    payment_status: string;
    event_id: string;
    payment_deadline?: string | null;
    profiles: { full_name: string; email: string; phone: string | null; college: string | null } | null;
    events: { name: string; event_date: string; venue: string; fee: number | null } | null;
    teams: { name: string } | null;
}

interface FestRegistration {
    id: string;
    created_at: string | null;
    payment_status: string | null;
    proof_status: string | null;
    fest_registration_code: string | null;
    full_name: string;
    email: string;
    phone: string;
    college: string | null;
}

interface RegistrationStatusCheckerProps {
    onClose: () => void;
}

export function RegistrationStatusChecker({ onClose }: RegistrationStatusCheckerProps) {
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [registrations, setRegistrations] = useState<Registration[] | null>(null);
    const [festRegistration, setFestRegistration] = useState<FestRegistration | null>(null);
    const [studentName, setStudentName] = useState('');
    const [expandedPass, setExpandedPass] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'fest' | 'events'>('fest');
    const [showFestPass, setShowFestPass] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!searchValue.trim()) {
            toast.error('Please enter your email');
            return;
        }

        // Validate input
        if (!searchValue.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        setLoading(true);
        setRegistrations(null);
        setFestRegistration(null);
        setSearched(false);
        setShowFestPass(false);

        try {
            const emailLower = searchValue.trim().toLowerCase();
            const emailPattern = `${emailLower}%`;

            // Fetch all fest registrations by email to find any approved one
            const { data: festRegs, error: festError } = await supabase
                .from('fest_registrations')
                .select('*')
                .ilike('email', emailPattern)
                .order('created_at', { ascending: false });

            if (festError) {
                console.error('Fest registration lookup error:', festError);
            }

            let festReg = null;
            if (festRegs && festRegs.length > 0) {
                // Prioritize approved registrations, then pending, then others
                // Since it's ordered by created_at desc, we get the latest of each status
                const approved = festRegs.find((r: any) => r.proof_status === 'approved');
                const pending = festRegs.find((r: any) => r.proof_status === 'pending');
                
                festReg = approved || pending || festRegs[0];
            }

            if (festReg) {
                setFestRegistration(festReg as FestRegistration);
                setStudentName(festReg.full_name);
                // Auto-show fest pass if approved
                if (festReg.proof_status === 'approved' && festReg.fest_registration_code) {
                    setShowFestPass(true);
                }
            }

            // Also find profile for event registrations
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, phone, college, fest_payment_status, fest_registration_id, email')
                .ilike('email', emailPattern)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (profileError) {
                console.error('Profile lookup error:', profileError);
            }

            if (profile) {
                if (!festReg) {
                    setStudentName(profile.full_name);

                    // Fallback: use profile fest info if fest_registrations row is missing
                    const festStatus = profile.fest_payment_status || null;
                    const festCode = profile.fest_registration_id || null;
                    if (festStatus || festCode) {
                        const syntheticFest: FestRegistration = {
                            id: festCode || profile.id,
                            created_at: null,
                            payment_status: festStatus,
                            proof_status: festStatus,
                            fest_registration_code: festCode,
                            full_name: profile.full_name,
                            email: profile.email?.toLowerCase() || emailLower,
                            phone: profile.phone || '',
                            college: profile.college,
                        };
                        setFestRegistration(syntheticFest);
                        if ((festStatus === 'approved' || festStatus === 'completed' || festStatus === 'verified') && festCode) {
                            setShowFestPass(true);
                        }
                    }
                }

                // Fetch all event registrations for this profile
                const { data: regs, error: regError } = await supabase
                    .from('registrations')
                    .select(`
                        id,
                        created_at,
                        payment_status,
                        event_id,
                        payment_deadline,
                        profiles (full_name, email, phone, college),
                        events (name, event_date, venue, fee),
                        teams (name)
                    `)
                    .eq('profile_id', profile.id)
                    .order('created_at', { ascending: false });

                if (!regError) {
                    setRegistrations(regs as Registration[] || []);
                }
            } else {
                setRegistrations([]);
            }

            setSearched(true);

            if (!festReg && (!profile)) {
                toast.info('No registrations found', {
                    description: 'No registrations found with this email'
                });
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Failed to search. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string | null) => {
        switch (status) {
            case 'completed':
            case 'verified':
            case 'approved':
            case 'payment_received':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'pending':
            case 'awaiting_payment_link':
                return <Clock className="w-5 h-5 text-yellow-500" />;
            case 'payment_link_sent':
                return <AlertCircle className="w-5 h-5 text-orange-500" />;
            case 'rejected':
            case 'failed':
            case 'slot_expired':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusBadge = (status: string | null) => {
        const styles: Record<string, string> = {
            completed: 'bg-green-500/20 text-green-500 border-green-500/30',
            verified: 'bg-green-500/20 text-green-500 border-green-500/30',
            approved: 'bg-green-500/20 text-green-500 border-green-500/30',
            payment_received: 'bg-green-500/20 text-green-500 border-green-500/30',
            pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
            awaiting_payment_link: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
            payment_link_sent: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
            rejected: 'bg-red-500/20 text-red-500 border-red-500/30',
            failed: 'bg-red-500/20 text-red-500 border-red-500/30',
            slot_expired: 'bg-red-500/20 text-red-500 border-red-500/30',
        };
        return styles[status || ''] || 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    };

    const getStatusDisplayName = (status: string | null) => {
        const names: Record<string, string> = {
            awaiting_payment_link: 'IN QUEUE',
            payment_link_sent: 'PAYMENT PENDING',
            payment_received: 'CONFIRMED',
            slot_expired: 'SLOT EXPIRED',
        };
        return names[status || ''] || (status || 'pending').toUpperCase();
    };

    const getStatusMessage = (status: string | null, deadline?: string | null) => {
        switch (status) {
            case 'completed':
            case 'verified':
            case 'approved':
            case 'payment_received':
                return '✅ Your payment is verified! You are confirmed for this event.';
            case 'pending':
                return '⏳ Payment verification in progress. Usually takes 24-48 hours.';
            case 'awaiting_payment_link':
                return '⏳ You are in the queue! We will send you a payment link soon on a first-come-first-serve basis.';
            case 'payment_link_sent':
                if (deadline) {
                    const deadlineDate = new Date(deadline);
                    const now = new Date();
                    const hoursLeft = Math.max(0, Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
                    if (hoursLeft <= 0) {
                        return '⚠️ Deadline has passed! Your slot may be given to the next person.';
                    }
                    return `📧 Payment link sent! Reply to the email with your payment proof within ${hoursLeft} hours to confirm your slot.`;
                }
                return '📧 Payment link sent to your email! Reply with payment proof to confirm your slot.';
            case 'slot_expired':
                return '❌ Your slot has expired because payment was not received in time. The slot was given to the next person in queue.';
            case 'rejected':
            case 'failed':
                return '❌ Payment was not verified. Please contact support.';
            default:
                return 'Status unknown';
        }
    };

    const isFestApproved = festRegistration?.proof_status === 'approved' && festRegistration?.fest_registration_code;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 overflow-y-auto">
            <div className="w-full min-h-full flex flex-col items-center justify-start p-4 py-8">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="fixed top-4 right-4 z-50 p-2 border-2 border-red-600 bg-black text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
                >
                    <X size={24} />
                </button>

                <div className="w-full max-w-lg mt-12">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Ticket className="w-7 h-7 text-red-500" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-red-500 mb-2" style={{
                            textShadow: '0 0 20px rgba(255, 0, 0, 0.5)',
                            fontFamily: 'serif'
                        }}>
                            CHECK STATUS & GET PASS
                        </h2>
                        <p className="text-red-400/60 text-sm">
                            Enter your email to view registrations and get your Fest Pass
                        </p>
                    </div>

                    {/* Search Form */}
                    <Card className="bg-black/40 border-red-600/30 p-6 mb-6">
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder="your.email@example.com"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    className="bg-black/40 border-red-600/30 flex-1"
                                    maxLength={100}
                                />
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Search className="w-5 h-5" />
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Tabs - show only after search */}
                    {searched && (
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveTab('fest')}
                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                                    activeTab === 'fest'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-black/40 text-gray-400 border border-red-600/30 hover:border-red-500/50'
                                }`}
                            >
                                <Ticket className="w-4 h-4" />
                                Fest Pass
                                {isFestApproved && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('events')}
                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                                    activeTab === 'events'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-black/40 text-gray-400 border border-red-600/30 hover:border-red-500/50'
                                }`}
                            >
                                <Trophy className="w-4 h-4" />
                                Events ({registrations?.length || 0})
                            </button>
                        </div>
                    )}

                    {/* Results */}
                    {searched && (
                        <div className="space-y-4">
                            {studentName && (
                                <p className="text-white/80 text-center">
                                    Welcome back, <span className="text-red-400 font-semibold">{studentName}</span>!
                                </p>
                            )}

                            {/* Fest Pass Tab */}
                            {activeTab === 'fest' && (
                                <>
                                    {!festRegistration ? (
                                        <Card className="bg-black/40 border-red-600/30 p-8 text-center">
                                            <div className="text-4xl mb-4">🎫</div>
                                            <p className="text-white/70 mb-2">No fest registration found</p>
                                            <p className="text-white/50 text-sm mb-4">
                                                Register for the fest to get your Fest Pass
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                                onClick={() => window.open('/fest-registration', '_self')}
                                            >
                                                Register for Fest
                                            </Button>
                                        </Card>
                                    ) : (
                                        <Card className="bg-black/40 border-red-600/30 p-5 hover:border-red-500/50 transition-all">
                                            {/* Registration Info */}
                                            <div className="space-y-4">
                                                {/* Student Info */}
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="text-white font-semibold text-xl">{festRegistration.full_name}</h3>
                                                        <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                                                            <Mail className="w-3 h-3" />
                                                            <span>{festRegistration.email}</span>
                                                        </div>
                                                        {festRegistration.phone && (
                                                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                                <Phone className="w-3 h-3" />
                                                                <span>{festRegistration.phone}</span>
                                                            </div>
                                                        )}
                                                        {festRegistration.college && (
                                                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                                <Building className="w-3 h-3" />
                                                                <span>{festRegistration.college}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        {getStatusIcon(festRegistration.proof_status)}
                                                    </div>
                                                </div>

                                                {/* Status */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge className={getStatusBadge(festRegistration.proof_status)}>
                                                        {(festRegistration.proof_status || 'pending').toUpperCase()}
                                                    </Badge>
                                                    {festRegistration.fest_registration_code && (
                                                        <span className="text-green-400 font-mono text-sm">
                                                            Code: {festRegistration.fest_registration_code}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-white/70 text-sm">
                                                    {getStatusMessage(festRegistration.proof_status)}
                                                </p>

                                                {/* Get Fest Pass Button - only for approved */}
                                                {isFestApproved && (
                                                    <Button
                                                        onClick={() => setShowFestPass(!showFestPass)}
                                                        className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-semibold py-3"
                                                        size="lg"
                                                    >
                                                        <Ticket className="w-5 h-5 mr-2" />
                                                        {showFestPass ? 'Hide Fest Pass' : '🎫 GET YOUR FEST PASS'}
                                                        {showFestPass ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                                                    </Button>
                                                )}

                                                {/* Fest Pass */}
                                                {showFestPass && isFestApproved && (
                                                    <div className="mt-6 pt-6 border-t border-red-600/30">
                                                        <FestPassGenerator
                                                            registration={{
                                                                id: festRegistration.id,
                                                                full_name: festRegistration.full_name,
                                                                email: festRegistration.email,
                                                                phone: festRegistration.phone,
                                                                college: festRegistration.college || undefined,
                                                                fest_registration_code: festRegistration.fest_registration_code!
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    )}
                                </>
                            )}

                            {/* Events Tab */}
                            {activeTab === 'events' && (
                                <>
                                    {(!registrations || registrations.length === 0) ? (
                                        <Card className="bg-black/40 border-red-600/30 p-8 text-center">
                                            <div className="text-4xl mb-4">🏆</div>
                                            <p className="text-white/70 mb-2">No event registrations found</p>
                                            <p className="text-white/50 text-sm">
                                                Register for events to see them here
                                            </p>
                                        </Card>
                                    ) : (
                                        registrations.map((reg) => (
                                    <Card key={reg.id} className="bg-black/40 border-red-600/30 p-4 hover:border-red-500/50 transition-all">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Trophy className="w-5 h-5 text-red-500" />
                                                    <h3 className="text-white font-semibold">{reg.events?.name}</h3>
                                                    {reg.events?.fee && reg.events.fee > 0 && (
                                                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                                            ₹{reg.events.fee}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {reg.teams?.name && (
                                                    <p className="text-white/60 text-sm mb-1">
                                                        Team: {reg.teams.name}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>Registered on {new Date(reg.created_at).toLocaleDateString()}</span>
                                                </div>

                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {getStatusIcon(reg.payment_status)}
                                                    <Badge className={getStatusBadge(reg.payment_status)}>
                                                        {getStatusDisplayName(reg.payment_status)}
                                                    </Badge>
                                                    {/* Show deadline countdown for payment_link_sent */}
                                                    {reg.payment_status === 'payment_link_sent' && reg.payment_deadline && (
                                                        <span className="text-orange-400 text-xs font-medium">
                                                            ⏰ Deadline: {new Date(reg.payment_deadline).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-white/60 text-xs mt-2">
                                                    {getStatusMessage(reg.payment_status, reg.payment_deadline)}
                                                </p>

                                                {/* Queue position info for awaiting_payment_link */}
                                                {reg.payment_status === 'awaiting_payment_link' && (
                                                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                                        <div className="flex items-center gap-2 text-yellow-400 text-sm">
                                                            <Users className="w-4 h-4" />
                                                            <span>You're in the payment queue</span>
                                                        </div>
                                                        <p className="text-yellow-300/70 text-xs mt-1">
                                                            We'll send you a payment link via email shortly. Keep an eye on your inbox!
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Action needed alert for payment_link_sent */}
                                                {reg.payment_status === 'payment_link_sent' && (
                                                    <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                                        <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
                                                            <AlertCircle className="w-4 h-4" />
                                                            <span>Action Required!</span>
                                                        </div>
                                                        <p className="text-orange-300/70 text-xs mt-1">
                                                            Check your email for the payment link. Reply with your payment proof attached to confirm your slot.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Slot expired info */}
                                                {reg.payment_status === 'slot_expired' && (
                                                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                        <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                                                            <XCircle className="w-4 h-4" />
                                                            <span>Slot Given to Next Person</span>
                                                        </div>
                                                        <p className="text-red-300/70 text-xs mt-1">
                                                            Your payment deadline passed. You can register again if slots are still available.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Show QR Pass button for completed registrations */}
                                                {(reg.payment_status === 'completed' || reg.payment_status === 'verified' || reg.payment_status === 'payment_received') && (
                                                    <Button
                                                        onClick={() => setExpandedPass(expandedPass === reg.id ? null : reg.id)}
                                                        className="mt-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white w-full"
                                                        size="sm"
                                                    >
                                                        <QrCode className="w-4 h-4 mr-2" />
                                                        {expandedPass === reg.id ? 'Hide Event Pass' : 'View Event Pass'}
                                                        {expandedPass === reg.id ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* QR Pass Section */}
                                        {expandedPass === reg.id && (reg.payment_status === 'completed' || reg.payment_status === 'verified' || reg.payment_status === 'payment_received') && (
                                            <div className="mt-4 pt-4 border-t border-red-600/30">
                                                <QRPassGenerator
                                                    registration={{
                                                        id: reg.id,
                                                        event_id: reg.event_id,
                                                        name: reg.profiles?.full_name || studentName,
                                                        email: reg.profiles?.email || searchValue,
                                                        phone: reg.profiles?.phone || null,
                                                        college: reg.profiles?.college || null,
                                                        education_type: ''
                                                    }}
                                                    eventName={reg.events?.name || 'KAIZEN Event'}
                                                    eventDate={reg.events?.event_date ? new Date(reg.events.event_date).toLocaleDateString() : undefined}
                                                    eventVenue={reg.events?.venue}
                                                />
                                            </div>
                                        )}
                                    </Card>
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Info Box - show before search */}
                    {!searched && (
                        <Card className="bg-blue-500/10 border-blue-500/30 p-4">
                            <h4 className="text-blue-400 font-medium mb-2">ℹ️ How to get your Fest Pass</h4>
                            <ul className="text-blue-300/80 text-sm space-y-1">
                                <li>1. Enter your registered email address</li>
                                <li>2. If your payment is verified, click "Fest Pass" tab</li>
                                <li>3. Click "GET YOUR FEST PASS" button</li>
                                <li>4. Download and show it at the entrance!</li>
                            </ul>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
