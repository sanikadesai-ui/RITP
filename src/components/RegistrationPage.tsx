import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle2, Flame, Ghost, Loader2, QrCode, Skull, X, Zap, Users, Lock, Clock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { generateUUID } from '@/utils/uuid';

const registrationSchema = z.object({
  eventId: z.string().min(1, "Please select an event"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100).regex(/^[a-zA-Z\s]+$/, "Name should only contain letters"),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  college: z.string().trim().min(2, "College name required").max(200),
  year: z.string().min(1, "Please select your year"),
  branch: z.string().trim().min(2, "Branch required").max(100),
  educationType: z.string().min(1, "Please select your education type"),
  teamName: z.string().trim().max(100).optional().or(z.literal("")),
  declaration: z.boolean().refine(val => val === true, "You must agree to the terms"),
});

interface RegistrationPageProps {
  onClose: () => void;
  initialEventId?: string;
}

interface Event {
  id: string;
  name: string;
  category: string;
  registration_fee: number;
  event_type: string;
  upi_qr_url?: string;
  max_team_size?: number;
  min_team_size?: number;
  registration_start_date?: string;
  registration_end_date?: string;
  status: string;
  max_participants?: number;
  current_participants?: number;
}

interface RegistrationSettings {
  registration_enabled: boolean;
  registration_notice: string;
}

// Helper function to check if event registration is open
function getEventRegistrationStatus(event: Event): { isOpen: boolean; isPaid: boolean; message: string } {
  const now = new Date();
  const isPaid = event.registration_fee > 0;
  
  // Check if max participants reached (for all events)
  if (event.max_participants && event.current_participants && 
      event.current_participants >= event.max_participants) {
    return { isOpen: false, isPaid, message: 'Event Full' };
  }
  
  // Check if registration has started (for ALL events with start date, not just paid)
  if (event.registration_start_date) {
    const startDate = new Date(event.registration_start_date);
    if (startDate > now) {
      return {
        isOpen: false,
        isPaid,
        message: `Opens ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}`
      };
    }
  }
  
  // Check if registration has ended (for all events)
  if (event.registration_end_date) {
    const endDate = new Date(event.registration_end_date);
    if (endDate < now) {
      return { isOpen: false, isPaid, message: 'Registration Closed' };
    }
  }
  
  return { isOpen: true, isPaid, message: isPaid ? 'Registration Open' : 'Free Event' };
}

export function RegistrationPage({ onClose, initialEventId }: RegistrationPageProps) {
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [registrationSettings, setRegistrationSettings] = useState<RegistrationSettings>({
    registration_enabled: true,
    registration_notice: ''
  });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    college: '',
    year: '',
    branch: '',
    educationType: '',
    eventId: initialEventId || '',
    teamName: '',
    declaration: false,
    paymentProof: null as File | null,
    festRegistrationCode: '', // New field for Fest Code
  });

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; email: string; code: string }[]>([]);
  const [memberCode, setMemberCode] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [showFestCheck, setShowFestCheck] = useState(true);

  const [step, setStep] = useState(1);

  const selectedEvent = useMemo(() =>
    events.find(e => e.id === formData.eventId),
    [events, formData.eventId]
  );

  // Helper function to get registration status for selected event (used for form validation)
  const getSelectedEventRegistrationStatus = useCallback((event: Event) => {
    const now = new Date();
    
    // Check if registration hasn't started yet
    if (event.registration_start_date && new Date(event.registration_start_date) > now) {
      const startDate = new Date(event.registration_start_date);
      return { 
        canRegister: false, 
        status: 'upcoming' as const,
        message: `Opens ${startDate.toLocaleString('en-US', { month: 'short', day: 'numeric' })}`
      };
    }
    
    // Check if registration has ended
    if (event.registration_end_date && new Date(event.registration_end_date) < now) {
      return { canRegister: false, status: 'closed' as const, message: 'Closed' };
    }
    
    // Check if max participants reached
    if (event.max_participants && event.current_participants && 
        event.current_participants >= event.max_participants) {
      return { canRegister: false, status: 'full' as const, message: 'Full' };
    }
    
    return { canRegister: true, status: 'open' as const, message: 'Open' };
  }, []);

  // Calculate registration status for selected event
  const registrationStatus = useMemo(() => {
    if (!selectedEvent) return { canRegister: true, message: '', status: 'unknown' };
    return getSelectedEventRegistrationStatus(selectedEvent);
  }, [selectedEvent, getSelectedEventRegistrationStatus]);

  // Verify Fest Code before proceeding
  const verifyFestCode = async () => {
    if (!formData.festRegistrationCode) {
      toast.error("Please enter your Fest Registration Code");
      return false;
    }

    setLoading(true);
    try {
      // Use the new RPC function to validate code and fetch profile
      const { data, error } = await supabase.rpc('get_profile_by_fest_code', {
        p_code: formData.festRegistrationCode
      });

      if (error) {
        console.error("RPC Error:", error);
        toast.error("Validation failed. Please try again.");
        return false;
      }

      // Check the success flag from the RPC response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = data as any;

      if (!result || !result.success) {
        toast.error(result?.message || "Invalid Fest Code. Please register for the Fest first.");
        return false;
      }

      const profile = result.data;

      // Auto-fill form data from profile
      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone || '',
        college: profile.college || '',
        year: profile.year || '',
        branch: profile.branch || '',
        educationType: profile.education || '',
      }));

      toast.success("Fest Code Verified! Details auto-filled.");
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addTeamMember = async () => {
    if (!memberCode) {
      toast.error("Please enter a Fest ID");
      return;
    }
    
    // Check if already added
    if (teamMembers.some(m => m.code === memberCode)) {
      toast.error("Member already added");
      setMemberCode('');
      return;
    }

    if (formData.festRegistrationCode === memberCode) {
      toast.error("You are already the team leader!");
      setMemberCode('');
      return;
    }

    if (selectedEvent?.max_team_size && (teamMembers.length + 1) >= selectedEvent.max_team_size) {
       toast.error(`Maximum team size is ${selectedEvent.max_team_size}`);
       return;
    }

    setAddingMember(true);
    try {
       const { data, error } = await supabase.rpc('get_profile_by_fest_code', {
        p_code: memberCode
      });

      if (error) throw error;
      const result = data as any;
      if (!result || !result.success) {
        toast.error("Invalid Fest ID");
      } else {
        const p = result.data;
        setTeamMembers(prev => [...prev, { id: p.id, name: p.full_name, email: p.email, code: memberCode }]);
        setMemberCode('');
        toast.success("Member Added: " + p.full_name);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify member");
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = (code: string) => {
    setTeamMembers(prev => prev.filter(m => m.code !== code));
  };

  const nextStep = async () => {
    if (step === 1) {
      if (!formData.eventId) { toast.error("Please select an event"); return; }
      
      // Check registration status BEFORE proceeding
      if (!registrationStatus.canRegister) {
        toast.error(registrationStatus.message || "Registration is not available for this event");
        return;
      }
      
      if (selectedEvent?.event_type === 'team') {
         if (!formData.teamName) { toast.error("Please enter a team name"); return; }
         
         // Team members are mandatory - minimum 2 people (including leader)
         const minTeamSize = selectedEvent.min_team_size || 2; // Default to 2 if not set
         if ((teamMembers.length + 1) < minTeamSize) {
            toast.error(`Team events require at least ${minTeamSize} members (including you). Please add ${minTeamSize - teamMembers.length - 1} more team member${minTeamSize - teamMembers.length - 1 > 1 ? 's' : ''}.`);
            return;
         }
      }

      // Verify code before moving to personal details
      const isValid = await verifyFestCode();
      if (!isValid) return;

    } else if (step === 2) {
      if (!formData.fullName || !formData.email || !formData.phone || !formData.college || !formData.year || !formData.branch || !formData.educationType) {
        toast.error("Please fill in all fields");
        return;
      }
      if (!formData.email.includes('@')) { toast.error("Invalid email"); return; }
      if (!/^[6-9]\d{9}$/.test(formData.phone)) { toast.error("Invalid phone number"); return; }
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const fetchRegistrationSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['registration_enabled', 'registration_notice']);

      if (error) throw error;

      if (data) {
        const settingsMap: Record<string, unknown> = {};
        data.forEach((s: { key: string; value: string }) => {
          try {
            settingsMap[s.key] = JSON.parse(String(s.value));
          } catch {
            settingsMap[s.key] = s.value;
          }
        });
        setRegistrationSettings({
          registration_enabled: settingsMap.registration_enabled !== false,
          registration_notice: String(settingsMap.registration_notice || '').replace(/"/g, '')
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, category, registration_fee, event_type, upi_qr_url, max_team_size, min_team_size, registration_start_date, registration_end_date, status, max_participants, current_participants')
        .in('status', ['upcoming', 'ongoing'])
        .order('event_date');

      if (error) throw error;

      setEvents(data || []);
      if (!data || data.length === 0) {
        setError('No events available at the moment.');
      }
    } catch (err: unknown) {
      console.error('Exception fetching events:', err);
      setError('Failed to load events. Please check your connection and try again.');
      toast.error('Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchRegistrationSettings();

    const params = new URLSearchParams(window.location.search);
    const eventIdParam = params.get('event');
    if (eventIdParam) {
      setFormData(prev => ({ ...prev, eventId: eventIdParam }));
    }

    // Real-time subscription for events
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents, fetchRegistrationSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Final registration status check before submitting
    if (!registrationStatus.canRegister) {
      toast.error(registrationStatus.message || "Registration is not available for this event");
      return;
    }

    try {
      registrationSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      // Case 1: Paid Event - Register first, then send email with payment info
      if (selectedEvent && selectedEvent.registration_fee > 0) {
        // Register without payment proof - First Come First Serve model
        // @ts-expect-error - RPC function not yet in types
        const { data: result, error: rpcError } = await supabase.rpc('register_user_for_event', {
          p_full_name: formData.fullName,
          p_email: formData.email.toLowerCase().trim(),
          p_phone: formData.phone,
          p_college: formData.college,
          p_year: formData.year,
          p_branch: formData.branch,
          p_education: formData.educationType,
          p_event_id: formData.eventId,
          p_team_name: formData.teamName || null,
          p_payment_proof_url: null,
          p_registration_fee: selectedEvent.registration_fee,
          p_payment_status: 'awaiting_payment',
          p_member_ids: teamMembers.map(m => m.id)
        });

        if (rpcError) throw rpcError;
        if (result && !result.success) throw new Error(result.message || 'Registration failed');

        // Send email notification for paid event - We will contact them with payment link
        supabase.functions.invoke('send-registration-email', {
          body: {
            to: formData.email,
            type: 'paid_event_registration',
            data: {
              name: formData.fullName,
              eventName: selectedEvent?.name || 'Event',
              registrationFee: selectedEvent.registration_fee,
              teamName: formData.teamName || null,
              phone: formData.phone,
              college: formData.college
            }
          }
        }).catch(console.error);

        // Send to team members if any
        if (teamMembers.length > 0) {
          teamMembers.forEach(member => {
            supabase.functions.invoke('send-registration-email', {
              body: {
                to: member.email,
                type: 'paid_event_registered',
                data: {
                  name: member.name,
                  eventName: selectedEvent?.name || 'Event',
                  registrationFee: selectedEvent.registration_fee,
                  isTeamMember: true,
                  teamName: formData.teamName
                }
              }
            }).catch(console.error);
          });
        }

        setSuccess(true);
        toast.success('Registration Submitted!', {
          description: 'We will contact you shortly with the payment link.',
        });
        setLoading(false);

      } else {
        // Case 2: Free Event (Existing Logic)
        // @ts-expect-error - RPC function not yet in types
        const { data: result, error: rpcError } = await supabase.rpc('register_user_for_event', {
          p_full_name: formData.fullName,
          p_email: formData.email.toLowerCase().trim(),
          p_phone: formData.phone,
          p_college: formData.college,
          p_year: formData.year,
          p_branch: formData.branch,
          p_education: formData.educationType,
          p_event_id: formData.eventId,
          p_team_name: formData.teamName || null,
          p_payment_proof_url: null,
          p_registration_fee: 0,
          p_payment_id: null,
          p_payment_status: null,
          p_member_ids: teamMembers.map(m => m.id)
        });

        if (rpcError) throw rpcError;

        const registrationResult = result as unknown as { success: boolean; message?: string; registration_id?: string };

        if (registrationResult && !registrationResult.success) {
          throw new Error(registrationResult.message || 'Registration failed');
        }

        // Send confirmation email to Leader
        supabase.functions.invoke('send-registration-email', {
          body: {
            to: formData.email,
            type: 'registration_confirmation',
            data: {
              name: formData.fullName,
              eventName: selectedEvent?.name || 'Event',
            }
          }
        }).catch(console.error);

        // Send confirmation emails to Team Members (if any)
        if (teamMembers.length > 0) {
            teamMembers.forEach(member => {
                supabase.functions.invoke('send-registration-email', {
                  body: {
                    to: member.email,
                    type: 'registration_confirmation',
                    data: {
                      name: member.name,
                      eventName: selectedEvent?.name || 'Event',
                      isTeamMember: true,
                      teamName: formData.teamName
                    }
                  }
                }).catch(console.error);
            });
        }

        setSuccess(true);
        toast.success('Registration Successful!', {
          description: 'You are now registered!',
        });
        setLoading(false);
      }

    } catch (error: unknown) {
      console.error('Registration error:', error);
      const err = error as { message?: string; error_description?: string };
      const errorMessage = err?.message || err?.error_description || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error('Registration Failed', {
        description: errorMessage,
      });
      setLoading(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    if (name === 'declaration') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, paymentProof: e.target.files![0] }));
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl h-[100dvh] sm:h-full sm:max-h-[90vh] flex flex-col bg-gradient-to-br from-zinc-900 via-black to-zinc-950 border-0 sm:border border-white/10 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header - Horror Theme */}
        <div className="flex items-center justify-between p-6 border-b border-red-900/30 bg-gradient-to-r from-black via-red-950/20 to-black backdrop-blur-xl sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 rounded-xl border border-red-600/40 shadow-lg shadow-red-900/30 animate-pulse">
              <Skull className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-100 tracking-wide flex items-center gap-2">
                Enter The Upside Down
                <Ghost className="w-4 h-4 text-red-400 animate-bounce" />
              </h2>
              <p className="text-xs text-red-400/60">Step {step} of 3: {step === 1 ? 'Select Event & Verify Code' : step === 2 ? 'Confirm Details' : 'Payment & Submit'}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
          <div className="p-6 sm:p-8">
            {success ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                  <div className="relative rounded-full bg-gradient-to-b from-green-500/20 to-green-500/5 p-6 ring-1 ring-green-500/50">
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    {selectedEvent?.registration_fee === 0 ? 'Registration Complete' : 'Registration Received!'}
                    {selectedEvent?.registration_fee === 0 ? 'Registration Complete' : 'Registration Submitted'}
                    {selectedEvent?.registration_fee === 0 ? 'Registration Complete' : 'Registration Submitted'}
                  </h2>
                  <p className="text-zinc-400 max-w-md mx-auto">
                    {selectedEvent?.registration_fee === 0
                      ? 'You have successfully registered for the event.'
                      : `Thank you for registering for ${selectedEvent?.name || 'this event'}!`}
                  </p>
                </div>

                {/* Paid Event - First Come First Serve Message */}
                {selectedEvent && selectedEvent.registration_fee > 0 && (
                  <div className="p-5 bg-gradient-to-br from-amber-950/40 to-orange-950/20 border border-amber-500/30 rounded-xl max-w-md w-full">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Clock className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-amber-300">First Come, First Serve</h4>
                        <p className="text-sm text-amber-200/80">
                          We will contact you soon with the payment link. Seats are limited and allocated on a first come, first serve basis.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-zinc-400">Registration Fee:</span>
                          <span className="text-sm font-bold text-white">₹{selectedEvent.registration_fee}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedEvent?.registration_fee && selectedEvent.registration_fee > 0 && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg max-w-sm w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-5 h-5 text-blue-400" />
                      <p className="text-sm font-medium text-blue-400">What's Next?</p>
                    </div>
                    <ul className="text-sm text-zinc-400 space-y-1.5 ml-8">
                      <li>• Check your email for confirmation</li>
                      <li>• We'll send you the payment link shortly</li>
                      <li>• Complete payment to confirm your seat</li>
                    </ul>
                  </div>
                )}
                <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-lg max-w-sm w-full text-center">
                  <p className="text-sm text-green-400/80">
                    {selectedEvent?.registration_fee === 0 
                      ? 'A confirmation email has been sent to your inbox.'
                      : 'Check your email for registration details and next steps.'}
                  </p>
                </div>
                <Button
                  onClick={onClose}
                  className="bg-white text-black hover:bg-zinc-200 px-8 py-6 text-lg rounded-full font-medium transition-all hover:scale-105"
                >
                  Return to Events
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {registrationSettings.registration_notice && (
                  <Alert className="bg-yellow-500/5 border-yellow-500/20 text-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <AlertTitle className="text-yellow-500">Notice</AlertTitle>
                    <AlertDescription className="text-yellow-200/80">
                      {registrationSettings.registration_notice}
                    </AlertDescription>
                  </Alert>
                )}

                {!registrationSettings.registration_enabled ? (
                  <div className="text-center py-20 space-y-6">
                    <div className="text-6xl mb-4 opacity-50">🚫</div>
                    <h2 className="text-2xl font-bold text-white">Registration Closed</h2>
                    <p className="text-zinc-400">Registration is currently not available. Please check back later.</p>
                    <Button onClick={onClose} variant="outline" className="border-white/10 text-white hover:bg-white/5">
                      Close
                    </Button>
                  </div>
                ) : (
                  <>
                    {error && (
                      <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                      {/* Step Progress Indicator */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                          {[1, 2, 3].map((stepNum) => (
                            <div key={stepNum} className="flex items-center">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-all ${
                                step >= stepNum 
                                  ? 'bg-red-600 border-red-600 text-white' 
                                  : 'bg-transparent border-zinc-700 text-zinc-500'
                              }`}>
                                {step > stepNum ? '✓' : stepNum}
                              </div>
                              {stepNum < 3 && (
                                <div className={`w-16 sm:w-24 h-1 mx-2 rounded transition-all ${
                                  step > stepNum ? 'bg-red-600' : 'bg-zinc-700'
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span className={step >= 1 ? 'text-red-400' : ''}>Event & Code</span>
                          <span className={step >= 2 ? 'text-red-400' : ''}>Details</span>
                          <span className={step >= 3 ? 'text-red-400' : ''}>Payment</span>
                        </div>
                      </div>

                      {loadingEvents ? (
                        <div className="space-y-6">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-2">
                              <Skeleton className="h-4 w-24 bg-white/5" />
                              <Skeleton className="h-12 w-full bg-white/5 rounded-lg" />
                            </div>
                          ))}
                        </div>
                      ) : events.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-zinc-400">No events available at the moment.</p>
                        </div>
                      ) : (
                        <div className="grid gap-6">

                          {/* Step 1: Event Selection */}
                          {step === 1 && (
                            <div className="space-y-4 p-6 bg-gradient-to-br from-red-950/20 via-black to-red-950/10 border border-red-900/40 rounded-xl shadow-lg shadow-red-900/10 relative overflow-hidden animate-in slide-in-from-right">
                              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMjAsIDM4LCAzOCwgMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
                              <h3 className="text-lg font-semibold text-red-100 flex items-center gap-2 relative">
                                <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                                Choose Your Fate
                              </h3>

                              <div className="space-y-3 relative">
                                <Label className="text-red-300/80 text-sm font-medium">Select Event <span className="text-red-500">*</span></Label>
                                <Select 
                                  value={formData.eventId} 
                                  onValueChange={(value) => {
                                    // Check if the selected event is locked
                                    const selectedEvt = events.find(e => e.id === value);
                                    if (selectedEvt) {
                                      const status = getEventRegistrationStatus(selectedEvt);
                                      if (!status.isOpen) {
                                        toast.error(`This event is locked. ${status.message}`);
                                        return;
                                      }
                                    }
                                    handleChange('eventId', value);
                                  }}
                                >
                                  <SelectTrigger className="bg-black/60 border-red-800/50 text-white h-auto min-h-[3.5rem] py-3 focus:ring-red-500/50 focus:border-red-500 hover:border-red-600/60 transition-all duration-300 hover:bg-black/80 [&>span]:line-clamp-none [&>span]:text-left [&>span]:w-full">
                                    <SelectValue placeholder="⚡ Click to choose an event..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[300px] bg-black/95 border-red-900/50 backdrop-blur-xl">
                                    {events.map((event) => {
                                      const regStatus = getEventRegistrationStatus(event);
                                      const isLocked = !regStatus.isOpen;
                                      
                                      return (
                                        <SelectItem
                                          key={event.id}
                                          value={event.id}
                                          disabled={isLocked}
                                          className={`py-4 px-3 border-b border-red-900/20 last:border-0 transition-colors ${
                                            isLocked 
                                              ? 'opacity-60 cursor-not-allowed bg-zinc-900/50' 
                                              : 'focus:bg-red-900/30 hover:bg-red-900/20 cursor-pointer'
                                          }`}
                                        >
                                          <div className="flex flex-col gap-1.5 w-full">
                                            <div className="flex items-center gap-2">
                                              {isLocked && <Lock className="w-4 h-4 text-yellow-500" />}
                                              <span className={`font-semibold text-base ${isLocked ? 'text-zinc-400' : 'text-red-100'}`}>
                                                {event.name}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs px-2.5 py-1 rounded-full bg-red-900/40 text-red-300 border border-red-800/50">
                                                {event.category}
                                              </span>
                                              <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800/60 text-zinc-300 border border-zinc-700/50">
                                                {event.event_type === 'team' ? '👥 Team' : '👤 Solo'}
                                              </span>
                                              {isLocked ? (
                                                <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-700/50 flex items-center gap-1">
                                                  <Clock className="w-3 h-3" />
                                                  {regStatus.message}
                                                </span>
                                              ) : (
                                                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${event.registration_fee > 0
                                                  ? 'bg-orange-900/30 text-orange-300 border-orange-700/50'
                                                  : 'bg-green-900/30 text-green-300 border-green-700/50'
                                                }`}>
                                                  {event.registration_fee > 0 ? `₹${event.registration_fee}` : '✨ Free'}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>

                                {/* Selected Event Summary */}
                                {selectedEvent && (
                                  <div className={`mt-3 p-3 rounded-lg border ${
                                    !registrationStatus.canRegister 
                                      ? 'bg-red-950/30 border-red-500/30'
                                      : selectedEvent.registration_fee > 0 
                                        ? 'bg-orange-950/30 border-orange-500/30' 
                                        : 'bg-green-950/30 border-green-500/30'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-white">{selectedEvent.name}</p>
                                        <p className="text-xs text-zinc-400">
                                          {selectedEvent.event_type === 'team' ? '👥 Team Event' : '👤 Individual Event'} • {selectedEvent.category}
                                        </p>
                                      </div>
                                      <div className={`text-lg font-bold ${
                                        !registrationStatus.canRegister 
                                          ? 'text-red-400'
                                          : selectedEvent.registration_fee > 0 ? 'text-orange-400' : 'text-green-400'
                                      }`}>
                                        {selectedEvent.registration_fee > 0 ? `₹${selectedEvent.registration_fee}` : '🎉 FREE'}
                                      </div>
                                    </div>
                                    
                                    {/* Registration Status Warning */}
                                    {!registrationStatus.canRegister && (
                                      <div className="mt-3 p-2 bg-red-900/30 border border-red-500/40 rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <p className="text-sm text-red-300">{registrationStatus.message}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {selectedEvent?.event_type === 'team' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 relative z-20">
                                  <Label className="text-zinc-400">Team Name <span className="text-red-500">*</span></Label>
                                  <Input
                                    value={formData.teamName}
                                    onChange={(e) => handleChange('teamName', e.target.value)}
                                    required
                                    className="bg-black/40 border-white/10 text-white h-12 focus:border-red-500/50 focus:ring-red-500/20 relative z-20 pointer-events-auto"
                                    placeholder="Enter your team name"
                                  />
                                </div>
                              )}

                              {/* Team Members */}
                              {selectedEvent?.event_type === 'team' && (
                                <div className="space-y-4 pt-4 border-t border-white/10 relative z-20">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <Label className="text-blue-400 font-semibold flex items-center gap-2">
                                      <Users className="w-4 h-4" /> Team Members <span className="text-red-500">*</span>
                                    </Label>
                                    <span className={`text-xs px-2 py-1 rounded-full border ${
                                      (teamMembers.length + 1) >= (selectedEvent.min_team_size || 2)
                                        ? 'bg-green-900/30 text-green-400 border-green-700/50'
                                        : 'bg-yellow-900/30 text-yellow-400 border-yellow-700/50'
                                    }`}>
                                      {teamMembers.length + 1}/{selectedEvent.min_team_size || 2} members (min required)
                                    </span>
                                  </div>
                                  
                                  {(teamMembers.length + 1) < (selectedEvent.min_team_size || 2) && (
                                    <div className="p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                                      <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                      <p className="text-sm text-yellow-300">
                                        Add at least {(selectedEvent.min_team_size || 2) - teamMembers.length - 1} more team member{((selectedEvent.min_team_size || 2) - teamMembers.length - 1) > 1 ? 's' : ''} to proceed
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="flex gap-2 relative z-20">
                                    <Input
                                      value={memberCode}
                                      onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                                      placeholder="Member's Fest ID (e.g. KZN26-...)"
                                      className="bg-black/40 border-blue-500/30 text-white h-10 focus:border-blue-500 font-mono"
                                    />
                                    <Button 
                                      type="button"
                                      onClick={addTeamMember}
                                      disabled={addingMember}
                                      className="bg-blue-600 hover:bg-blue-500 text-white border-none min-w-[100px]"
                                    >
                                      {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                                    </Button>
                                  </div>

                                  {/* Member List */}
                                  {teamMembers.length > 0 && (
                                    <div className="space-y-2">
                                      {teamMembers.map((member) => (
                                        <div key={member.code} className="flex items-center justify-between p-2 bg-blue-900/10 border border-blue-800/20 rounded-md">
                                          <div>
                                            <p className="text-sm font-medium text-blue-200">{member.name}</p>
                                            <p className="text-xs text-blue-400">{member.code}</p>
                                          </div>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeMember(member.code)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8 p-0"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {selectedEvent.max_team_size && (
                                    <p className="text-xs text-zinc-500 text-right">
                                      {teamMembers.length + 1} / {selectedEvent.max_team_size} members
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Fest Code Input */}
                              <div className="space-y-2 pt-4 border-t border-white/10 relative z-20">
                                <Label className="text-purple-400 font-semibold flex items-center gap-2">
                                  <Zap className="w-4 h-4" /> Fest Registration Code <span className="text-red-500">*</span>
                                </Label>
                                <p className="text-xs text-yellow-400/80 mb-2">
                                  ⚠️ Required for ALL events (both free & paid). Complete Fest Registration first to get your code.
                                </p>
                                <div className="flex gap-2 relative z-20">
                                  <Input
                                    value={formData.festRegistrationCode}
                                    onChange={(e) => handleChange('festRegistrationCode', e.target.value.toUpperCase())}
                                    required
                                    className="bg-black/40 border-purple-500/30 text-white h-12 focus:border-purple-500 focus:ring-purple-500/20 relative z-20 pointer-events-auto font-mono tracking-wider"
                                    placeholder="e.g. KZN26-ABC1234"
                                  />
                                </div>
                                <p className="text-xs text-zinc-500">
                                  Don't have a code? <a href="/fest-registration" className="text-red-400 hover:text-red-300 underline">Register for the Fest first →</a>
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Step 2: Personal & Academic Details */}
                          {step === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right">
                              {/* Personal Details Section */}
                              <div className="space-y-4 p-6 bg-gradient-to-br from-zinc-900/80 via-black to-zinc-900/50 border border-zinc-800/60 rounded-xl shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl" />
                                <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2 relative">
                                  <span className="w-1.5 h-6 bg-gradient-to-b from-red-500 to-red-700 rounded-full" />
                                  Your Identity
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-zinc-400">Full Name</Label>
                                    <Input
                                      value={formData.fullName}
                                      onChange={(e) => handleChange('fullName', e.target.value)}
                                      required
                                      readOnly // Auto-filled from Fest Code
                                      className="bg-black/40 border-white/10 text-white/70 h-12 cursor-not-allowed"
                                      placeholder="John Doe"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-zinc-400">Phone Number</Label>
                                    <Input
                                      type="tel"
                                      value={formData.phone}
                                      onChange={(e) => handleChange('phone', e.target.value)}
                                      required
                                      readOnly
                                      className="bg-black/40 border-white/10 text-white/70 h-12 cursor-not-allowed"
                                      placeholder="10-digit mobile number"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-zinc-400">Email Address</Label>
                                  <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    required
                                    readOnly
                                    className="bg-black/40 border-white/10 text-white/70 h-12 cursor-not-allowed"
                                    placeholder="john@example.com"
                                  />
                                </div>
                              </div>

                              {/* Academic Details Section */}
                              <div className="space-y-4 p-6 bg-gradient-to-br from-purple-950/20 via-black to-purple-950/10 border border-purple-900/30 rounded-xl shadow-lg relative overflow-hidden">
                                <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-600/5 rounded-full blur-3xl" />
                                <h3 className="text-lg font-semibold text-purple-100 flex items-center gap-2 relative">
                                  <span className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full" />
                                  Academic Realm
                                </h3>

                                <div className="space-y-2">
                                  <Label className="text-zinc-400">College / University</Label>
                                  <Input
                                    value={formData.college}
                                    onChange={(e) => handleChange('college', e.target.value)}
                                    required
                                    readOnly
                                    className="bg-black/40 border-white/10 text-white/70 h-12 cursor-not-allowed"
                                    placeholder="Institution Name"
                                  />
                                </div>

                                {/* Education Type Field */}
                                <div className="space-y-2">
                                  <Label className="text-purple-300/80 text-sm font-medium">Education Type <span className="text-red-500">*</span></Label>
                                  <Select value={formData.educationType} onValueChange={(value) => handleChange('educationType', value)}>
                                    <SelectTrigger className="bg-black/60 border-purple-800/40 text-white h-12 hover:border-purple-600/60 transition-all">
                                      <SelectValue placeholder="Select Education Type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-purple-800/50 text-white shadow-xl" position="popper" sideOffset={8}>
                                      <SelectItem value="diploma" className="focus:bg-purple-900/30 hover:bg-purple-900/20 cursor-pointer py-3">
                                        Diploma
                                      </SelectItem>
                                      <SelectItem value="degree" className="focus:bg-purple-900/30 hover:bg-purple-900/20 cursor-pointer py-3">
                                        Degree (B.Tech / B.E. / B.Sc)
                                      </SelectItem>
                                      <SelectItem value="pg" className="focus:bg-purple-900/30 hover:bg-purple-900/20 cursor-pointer py-3">
                                        Post Graduate (M.Tech / M.E. / M.Sc)
                                      </SelectItem>
                                      <SelectItem value="other" className="focus:bg-purple-900/30 hover:bg-purple-900/20 cursor-pointer py-3">
                                        Other
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-purple-300/80 text-sm font-medium">Year of Study <span className="text-red-500">*</span></Label>
                                    <Select value={formData.year} onValueChange={(value) => handleChange('year', value)}>
                                      <SelectTrigger className="bg-black/60 border-purple-800/40 text-white h-12 hover:border-purple-600/60 transition-all">
                                        <SelectValue placeholder="Select Year" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-zinc-950 border-purple-800/50 text-white shadow-xl" position="popper" sideOffset={8}>
                                        {[1, 2, 3, 4].map(y => (
                                          <SelectItem key={y} value={y.toString()} className="focus:bg-purple-900/30 hover:bg-purple-900/20 cursor-pointer py-3">
                                            {y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-zinc-400">Branch</Label>
                                    <Input
                                      value={formData.branch}
                                      onChange={(e) => handleChange('branch', e.target.value)}
                                      required
                                      readOnly
                                      className="bg-black/40 border-white/10 text-white/70 h-12 focus:border-purple-500/50 focus:ring-purple-500/20 cursor-not-allowed"
                                      placeholder="e.g. CSE, ECE"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Step 3: Payment & Declaration */}
                          {step === 3 && (
                            <div className="space-y-6 animate-in slide-in-from-right">
                              
                              {/* Free Event Badge */}
                              {selectedEvent && selectedEvent.registration_fee === 0 && (
                                <div className="p-6 bg-gradient-to-br from-green-950/30 to-black border border-green-500/30 rounded-xl text-center">
                                  <div className="text-4xl mb-3">🎉</div>
                                  <h3 className="text-xl font-semibold text-green-400 mb-2">Free Event!</h3>
                                  <p className="text-zinc-400">There is no registration fee for this event.</p>
                                  <div className="mt-4 p-3 bg-green-950/50 rounded-lg">
                                    <p className="text-green-300 font-medium">{selectedEvent.name}</p>
                                    <p className="text-xs text-zinc-500">{selectedEvent.category} • {selectedEvent.event_type === 'team' ? 'Team Event' : 'Individual'}</p>
                                  </div>
                                </div>
                              )}

                              {/* Paid Event Banner */}
                              {selectedEvent && selectedEvent.registration_fee > 0 && (
                                <div className="space-y-6 p-6 bg-gradient-to-br from-amber-950/30 via-orange-950/20 to-black border border-amber-500/30 rounded-xl">
                                  <div className="flex items-center justify-between">
                                      <h3 className="text-lg font-semibold text-amber-400">Paid Event</h3>
                                      <div className="text-3xl font-bold text-white">
                                        ₹{selectedEvent.registration_fee}
                                      </div>
                                  </div>
                                  
                                  <div className="p-5 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-500/30">
                                      <div className="flex items-start gap-4">
                                        <div className="p-3 bg-yellow-500/20 rounded-full flex-shrink-0">
                                          <Zap className="w-6 h-6 text-yellow-500" />
                                        </div>
                                        <div className="space-y-3">
                                          <h4 className="font-bold text-yellow-400 text-lg">First Come, First Serve</h4>
                                          <p className="text-white/80 leading-relaxed">
                                            Register now to secure your spot! After you submit this registration, we will contact you shortly via email with the payment link.
                                          </p>
                                          <div className="flex items-center gap-2 text-yellow-300 font-medium text-sm">
                                            <span>🎯</span>
                                            <span>Our motto: Give every student a fair chance with proper time to register!</span>
                                          </div>
                                        </div>
                                      </div>
                                  </div>
                                </div>
                              )}

                              {/* How it Works */}
                                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                      <h5 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-yellow-500" /> How it works:
                                      </h5>
                                      <ol className="text-sm text-zinc-400 space-y-2">
                                        <li className="flex items-start gap-2">
                                          <span className="w-5 h-5 bg-red-600/20 rounded-full flex items-center justify-center text-xs text-red-400 shrink-0 mt-0.5">1</span>
                                          <span>Complete your registration below</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                          <span className="w-5 h-5 bg-red-600/20 rounded-full flex items-center justify-center text-xs text-red-400 shrink-0 mt-0.5">2</span>
                                          <span>We'll review and send you a payment link</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                          <span className="w-5 h-5 bg-red-600/20 rounded-full flex items-center justify-center text-xs text-red-400 shrink-0 mt-0.5">3</span>
                                          <span>Pay within the given time to confirm your spot</span>
                                        </li>
                                      </ol>
                                      
                                      <div className="mt-4 p-4 bg-green-950/30 rounded-lg border border-green-500/30">
                                          <div className="flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                            <div>
                                              <p className="text-green-400 font-medium">What happens next?</p>
                                              <p className="text-sm text-zinc-400">
                                                You'll receive an email with payment details and a link to complete your registration.
                                              </p>
                                            </div>
                                          </div>
                                      </div>
                                    </div>

                              {/* Declaration */}
                              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    id="declaration"
                                    checked={formData.declaration}
                                    onChange={(e) => handleChange('declaration', e.target.checked.toString())}
                                    required
                                    className="mt-1 w-4 h-4 rounded border-white/20 bg-black/50 text-red-600 focus:ring-red-500/50"
                                  />
                                  <Label htmlFor="declaration" className="text-sm cursor-pointer text-zinc-300 leading-relaxed select-none">
                                    I hereby declare that the information provided above is true to the best of my knowledge.
                                    I agree to abide by the rules and regulations of the event, and I accept the <a href="/terms" target="_blank" className="text-blue-400 hover:underline">Terms & Conditions</a>, <a href="/refund" target="_blank" className="text-blue-400 hover:underline">Refund Policy</a>, and <a href="/privacy" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</a>.
                                  </Label>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Navigation Buttons */}
                          <div className="flex gap-4 pt-4">
                            {step > 1 && (
                              <Button
                                type="button"
                                onClick={prevStep}
                                variant="outline"
                                className="flex-1 border-white/10 text-white hover:bg-white/5 h-12"
                              >
                                Back
                              </Button>
                            )}

                            {step < 3 ? (
                              <Button
                                type="button"
                                onClick={nextStep}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12"
                              >
                                Next Step
                              </Button>
                            ) : (
                              <Button
                                type="submit"
                                disabled={loading || uploading || !formData.declaration}
                                className="flex-1 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white h-12 font-semibold shadow-lg shadow-red-900/20 transition-all hover:scale-[1.01] disabled:opacity-70 disabled:hover:scale-100"
                              >
                                {loading || uploading ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Registering...
                                  </span>
                                ) : (
                                  'Complete Registration'
                                )}
                              </Button>
                            )}
                          </div>

                        </div>
                      )}
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showFestCheck} onOpenChange={setShowFestCheck}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-red-500/20 text-white z-[10000]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Fest Registration Required
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Before registering for any events, you must have a valid <strong>Fest Registration Code</strong> (e.g., KZN26-XXXX).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button 
              onClick={() => window.open('/fest-registration', '_blank')}
              className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold"
            >
              Get Fest Code (Register Now)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowFestCheck(false)}
              className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
            >
              I already have a code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}