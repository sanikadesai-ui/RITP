import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProtectedRoute } from '@/components/admin/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import {
  Search, Clock, Send, XCircle, CheckCircle, RefreshCw,
  Mail, Phone, Building, Calendar, Users, AlertTriangle,
  DollarSign, Timer, UserX, ChevronRight
} from 'lucide-react';

interface PaidEventRegistration {
  id: string;
  created_at: string;
  payment_status: string;
  payment_link_sent_at?: string | null;
  payment_deadline?: string | null;
  slot_expired?: boolean;
  event_id: string;
  profile_id: string;
  profiles: { 
    full_name: string; 
    email: string; 
    phone: string; 
    college: string; 
  };
  events: { 
    name: string; 
    registration_fee: number;
    upi_id?: string;
  };
  teams: { name: string } | null;
}

interface EventStats {
  event_id: string;
  event_name: string;
  registration_fee: number;
  awaiting_link_count: number;
  link_sent_count: number;
  overdue_count: number;
  confirmed_count: number;
  total_registrations: number;
}

export default function PaidEventQueue() {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<PaidEventRegistration[]>([]);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('awaiting_payment_link');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingLink, setSendingLink] = useState<string | null>(null);
  const [expiringSlot, setExpiringSlot] = useState<PaidEventRegistration | null>(null);
  const [sendLinkDialog, setSendLinkDialog] = useState<PaidEventRegistration | null>(null);
  const [deadlineHours, setDeadlineHours] = useState('24');
  const [customUpiId, setCustomUpiId] = useState('');
  const [showEventGroups, setShowEventGroups] = useState(true);

  const fetchEventStats = useCallback(async () => {
    // Get stats for paid events
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        name,
        registration_fee,
        registrations (
          id,
          payment_status,
          payment_deadline
        )
      `)
      .gt('registration_fee', 0);

    if (error) {
      console.error('Error fetching event stats:', error);
      return;
    }

    const stats: EventStats[] = (data || []).map((event: any) => {
      const regs = event.registrations || [];
      const now = new Date();
      return {
        event_id: event.id,
        event_name: event.name,
        registration_fee: event.registration_fee,
        awaiting_link_count: regs.filter((r: any) => r.payment_status === 'awaiting_payment_link').length,
        link_sent_count: regs.filter((r: any) => r.payment_status === 'payment_link_sent').length,
        overdue_count: regs.filter((r: any) => 
          r.payment_status === 'payment_link_sent' && 
          r.payment_deadline && 
          new Date(r.payment_deadline) < now
        ).length,
        confirmed_count: regs.filter((r: any) => ['completed', 'verified'].includes(r.payment_status)).length,
        total_registrations: regs.length,
      };
    });

    setEventStats(stats);
  }, []);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('registrations')
      .select(`
        id,
        created_at,
        payment_status,
        event_id,
        profile_id,
        profiles!inner (full_name, email, phone, college),
        events!inner (name, registration_fee, upi_id),
        teams (name)
      `)
      .gt('events.registration_fee', 0)
      .order('created_at', { ascending: true });

    if (selectedEvent !== 'all') {
      query = query.eq('event_id', selectedEvent);
    }

    if (statusFilter !== 'all') {
      query = query.eq('payment_status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch registrations',
        variant: 'destructive',
      });
    } else {
      let filtered = data || [];
      
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filtered = filtered.filter((r: any) => 
          r.profiles?.full_name?.toLowerCase().includes(search) ||
          r.profiles?.email?.toLowerCase().includes(search) ||
          r.profiles?.phone?.includes(search) ||
          r.events?.name?.toLowerCase().includes(search)
        );
      }

      setRegistrations(filtered as unknown as PaidEventRegistration[]);
    }

    setLoading(false);
  }, [selectedEvent, statusFilter, searchQuery, toast]);

  useEffect(() => {
    fetchEventStats();
    fetchRegistrations();
  }, [fetchEventStats, fetchRegistrations]);

  const [customDeadline, setCustomDeadline] = useState('');
  const [customQrFile, setCustomQrFile] = useState<File | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  // ... (keep fetch functions as is)

  // Use effect to set default amount when dialog opens
  useEffect(() => {
    if (sendLinkDialog) {
        setCustomAmount(sendLinkDialog.events.registration_fee.toString());
    }
  }, [sendLinkDialog]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCustomQrFile(e.target.files[0]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSendPaymentLink = async (registration: PaidEventRegistration) => {
    setSendingLink(registration.id);

    try {
      // Determine UPI ID
      let upiId = customUpiId.trim();
      if (!upiId) upiId = registration.events.upi_id || '';
      if (!upiId) {
         const { data: settings } = await supabase.from('settings').select('value').eq('key', 'fest_upi_id').maybeSingle();
         if (settings) upiId = typeof settings.value === 'string' ? settings.value.replace(/"/g, '') : '';
      }

      // 1. Check if we have AT LEAST a UPI ID OR a custom QR file
      // If we have a QR file, we don't strictly *need* a UPI ID string, but it's good to have.
      // But if we have neither, we must stop.
      if (!upiId && !customQrFile) {
        throw new Error("Missing Payment Info: Please enter a UPI ID OR upload a QR Code.");
      }

      // Calculate Deadline
      let deadline = new Date();
      if (deadlineHours === 'custom') {
        if (!customDeadline) throw new Error("Please select a custom deadline date/time.");
        deadline = new Date(customDeadline);
        if (deadline < new Date()) throw new Error("Deadline must be in the future.");
      } else {
        deadline.setHours(deadline.getHours() + parseInt(deadlineHours));
      }

      // Convert QR to Base64 if present
      let qrBase64 = null;
      if (customQrFile) {
        // Simple size check (2MB limit for email safety)
        if (customQrFile.size > 2 * 1024 * 1024) throw new Error("QR Image too large (Max 2MB)");
        qrBase64 = await convertFileToBase64(customQrFile);
      }

      // Update status in database
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          payment_status: 'payment_link_sent',
          payment_link_sent_at: new Date().toISOString(),
          payment_deadline: deadline.toISOString(),
        })
        .eq('id', registration.id);

      if (updateError) throw new Error(`Database Update Failed: ${updateError.message}`);

      // Send email notification
      const emailRes = await supabase.functions.invoke('send-registration-email', {
        body: {
          to: registration.profiles.email,
          type: 'payment_link_notification',
          data: {
            name: registration.profiles.full_name,
            eventName: registration.events.name,
            amount: parseFloat(customAmount) || registration.events.registration_fee || 0,
            paymentDeadline: deadline.toLocaleString('en-IN', { 
              dateStyle: 'medium', 
              timeStyle: 'short' 
            }),
            upiId: upiId,
            customQrBase64: qrBase64
          }
        }
      });
      
      if (emailRes.error) {
        // Revert on failure
        await supabase.from('registrations').update({ 
            payment_status: 'awaiting_payment_link', payment_link_sent_at: null, payment_deadline: null 
        }).eq('id', registration.id);
        throw new Error(`Email sending failed: ${emailRes.error.message || 'Unknown error'}`);
      } 
      
      toast({ title: 'Payment Link Sent!', description: `Email sent to ${registration.profiles.email}` });

      setSendLinkDialog(null);
      setCustomUpiId('');
      setCustomQrFile(null);
      setCustomDeadline('');
      setCustomAmount('');
      fetchRegistrations();
      fetchEventStats();

    } catch (error: any) {
      console.error('Error sending payment link:', error);
      toast({ title: 'Error', description: error.message || 'Failed to send payment link', variant: 'destructive' });
    } finally {
      setSendingLink(null);
    }
  };

  const handleExpireSlot = async (registration: PaidEventRegistration) => {
    try {
      const { error: updateError } = await supabase
        .from('registrations')
        .update({
          payment_status: 'slot_expired',
          slot_expired: true,
        })
        .eq('id', registration.id);

      if (updateError) throw updateError;

      // Send expiry notification email
      await supabase.functions.invoke('send-registration-email', {
        body: {
          to: registration.profiles.email,
          type: 'slot_expired_notification',
          data: {
            name: registration.profiles.full_name,
            eventName: registration.events.name,
          }
        }
      });

      toast({
        title: 'Slot Expired',
        description: `Slot expired for ${registration.profiles.full_name}. Notification sent.`,
      });

      setExpiringSlot(null);
      fetchRegistrations();
      fetchEventStats();

    } catch (error) {
      console.error('Error expiring slot:', error);
      toast({
        title: 'Error',
        description: 'Failed to expire slot',
        variant: 'destructive',
      });
    }
  };

  const handleMarkProofReceived = async (registration: PaidEventRegistration) => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ payment_status: 'payment_received' })
        .eq('id', registration.id);

      if (error) throw error;

      toast({
        title: 'Proof Marked',
        description: `Proof received for ${registration.profiles.full_name}`,
      });

      fetchRegistrations();
      fetchEventStats();

    } catch (error) {
      console.error('Error marking proof:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsCompleted = async (registration: PaidEventRegistration) => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ payment_status: 'completed' })
        .eq('id', registration.id);

      if (error) throw error;

      // Send confirmation email
      await supabase.functions.invoke('send-registration-email', {
        body: {
          to: registration.profiles.email,
          type: 'payment_update',
          data: {
            name: registration.profiles.full_name,
            eventName: registration.events.name,
            paymentStatus: 'completed',
          }
        }
      });

      toast({
        title: 'Payment Confirmed!',
        description: `Registration confirmed for ${registration.profiles.full_name}`,
      });

      fetchRegistrations();
      fetchEventStats();

    } catch (error) {
      console.error('Error confirming payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm payment',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string, deadline?: string | null) => {
    const isOverdue = deadline && new Date(deadline) < new Date();
    
    switch (status) {
      case 'awaiting_payment_link':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Awaiting Link</Badge>;
      case 'payment_link_sent':
        if (isOverdue) {
          return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">⚠️ Overdue</Badge>;
        }
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Link Sent</Badge>;
      case 'payment_received':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Payment Received</Badge>;
      case 'completed':
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Confirmed</Badge>;
      case 'slot_expired':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Slot Expired</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getQueuePosition = (registration: PaidEventRegistration) => {
    const eventRegs = registrations.filter(r => 
      r.event_id === registration.event_id && 
      !['slot_expired', 'failed', 'rejected'].includes(r.payment_status)
    );
    return eventRegs.findIndex(r => r.id === registration.id) + 1;
  };

  const renderRegistrationCard = (reg: PaidEventRegistration) => {
    const isOverdue = reg.payment_deadline && new Date(reg.payment_deadline) < new Date();
    
    return (
      <Card 
        key={reg.id} 
        className={`p-4 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all ${
          isOverdue && reg.payment_status === 'payment_link_sent' ? 'border-red-500/50 bg-red-950/10' : ''
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Queue Position */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-400">
              #{getQueuePosition(reg)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white">{reg.profiles.full_name}</h3>
                {getStatusBadge(reg.payment_status, reg.payment_deadline)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {reg.profiles.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {reg.profiles.phone}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(reg.created_at).toLocaleDateString()}
                </span>
                {reg.teams?.name && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {reg.teams.name}
                  </span>
                )}
                {reg.payment_deadline && reg.payment_status === 'payment_link_sent' && (
                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-yellow-400'}`}>
                    <Timer className="w-3 h-3" /> 
                    {isOverdue ? 'Overdue!' : `${getTimeRemaining(reg.payment_deadline)} left`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Event & Fee */}
          <div className="md:text-right">
            <p className="text-white font-medium">{reg.events.name}</p>
            <p className="text-green-400 font-bold text-lg">₹{reg.events.registration_fee}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {['awaiting_payment_link', 'pending'].includes(reg.payment_status) && (
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 gap-1"
                onClick={() => setSendLinkDialog(reg)}
              >
                <Send className="w-4 h-4" /> Send Payment Link
              </Button>
            )}
            
            {reg.payment_status === 'payment_link_sent' && (
              <>
                <Button 
                  size="sm" 
                  className="bg-purple-600 hover:bg-purple-700 gap-1"
                  onClick={() => handleMarkProofReceived(reg)}
                >
                  <Mail className="w-4 h-4" /> Proof Received
                </Button>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 gap-1"
                  onClick={() => handleMarkAsCompleted(reg)}
                >
                  <CheckCircle className="w-4 h-4" /> Confirm
                </Button>
                {isOverdue && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="gap-1"
                    onClick={() => setExpiringSlot(reg)}
                  >
                    <UserX className="w-4 h-4" /> Expire Slot
                  </Button>
                )}
              </>
            )}

            {reg.payment_status === 'payment_received' && (
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 gap-1"
                onClick={() => handleMarkAsCompleted(reg)}
              >
                <CheckCircle className="w-4 h-4" /> Verify & Confirm
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Paid Event Queue</h1>
              <p className="text-zinc-400">Manage first come, first serve payment queue</p>
            </div>
            <Button onClick={() => { fetchRegistrations(); fetchEventStats(); }} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>

          {/* Event Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventStats.map((stat) => (
              <Card 
                key={stat.event_id} 
                className={`p-4 bg-zinc-900/50 border-zinc-800 cursor-pointer transition-all hover:border-zinc-600 ${
                  selectedEvent === stat.event_id ? 'border-red-500 ring-1 ring-red-500/30' : ''
                }`}
                onClick={() => setSelectedEvent(selectedEvent === stat.event_id ? 'all' : stat.event_id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-white truncate">{stat.event_name}</h3>
                    <p className="text-green-400 font-bold">₹{stat.registration_fee}</p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-zinc-500 transition-transform ${selectedEvent === stat.event_id ? 'rotate-90' : ''}`} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-zinc-400">Awaiting:</span>
                    <span className="text-white font-medium">{stat.awaiting_link_count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-zinc-400">Link Sent:</span>
                    <span className="text-white font-medium">{stat.link_sent_count}</span>
                  </div>
                  {stat.overdue_count > 0 && (
                    <div className="flex items-center gap-2 col-span-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-400">Overdue:</span>
                      <span className="text-red-400 font-medium">{stat.overdue_count}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-zinc-400">Confirmed:</span>
                    <span className="text-white font-medium">{stat.confirmed_count}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Filters & Tabs */}
          <div className="space-y-4">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 p-1 bg-zinc-900 border border-zinc-800 h-auto gap-1">
                <TabsTrigger value="awaiting_payment_link" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2">
                   Queue
                </TabsTrigger>
                <TabsTrigger value="payment_link_sent" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white py-2">
                   Sent Links
                </TabsTrigger>
                <TabsTrigger value="payment_received" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white py-2">
                   Verify Proof
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-green-600 data-[state=active]:text-white py-2">
                   Completed
                </TabsTrigger>
                 <TabsTrigger value="slot_expired" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white py-2">
                   Expired
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Card className="p-4 bg-zinc-900/50 border-zinc-800">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      placeholder="Search by name, email, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-black/40 border-zinc-700"
                    />
                  </div>
                </div>
                {selectedEvent !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEvent('all')}>
                    Clear Event Filter
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Registrations List */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4 bg-zinc-900/50 border-zinc-800">
                  <div className="flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-full bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3 bg-zinc-800" />
                      <Skeleton className="h-3 w-1/2 bg-zinc-800" />
                    </div>
                  </div>
                </Card>
              ))
            ) : registrations.length === 0 ? (
              <Card className="p-12 bg-zinc-900/50 border-zinc-800 text-center">
                <Users className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">No registrations found in this section</p>
              </Card>
            ) : (
                // Grouped View for ALL modes (unless single event selected, then just one group)
                Object.entries(
                  registrations.reduce((acc, reg) => {
                    const evt = reg.events.name;
                    if (!acc[evt]) acc[evt] = [];
                    acc[evt].push(reg);
                    return acc;
                  }, {} as Record<string, PaidEventRegistration[]>)
                )
                .sort(([a], [b]) => a.localeCompare(b)) // Alphabetical order
                .map(([evtName, regs]) => (
                   <div key={evtName} className="mb-8 rounded-xl border border-zinc-800/50 bg-black/20 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800/50 sticky top-0 z-10 backdrop-blur-md">
                          <div className="flex items-center gap-3">
                              <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                              <h3 className="text-lg font-bold text-zinc-100">{evtName}</h3>
                              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
                                {regs.length} {regs.length === 1 ? 'Entry' : 'Entries'}
                              </Badge>
                          </div>
                      </div>
                      <div className="p-2 md:p-4 grid gap-3 grid-cols-1">
                          {regs.map(reg => renderRegistrationCard(reg))}
                      </div>
                   </div>
                ))
            )}
          </div>
        </div>

        {/* Send Payment Link Dialog */}
        <Dialog open={!!sendLinkDialog} onOpenChange={() => setSendLinkDialog(null)}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Send Payment Link</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Send payment link to {sendLinkDialog?.profiles.full_name} for {sendLinkDialog?.events.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <p className="text-sm text-zinc-400 mb-1">Standard Fee</p>
                    <p className="text-xl font-bold text-zinc-300">₹{sendLinkDialog?.events.registration_fee}</p>
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm text-zinc-400">Amount to Collect (₹)</label>
                     <Input 
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="bg-black/40 border-zinc-700 text-lg font-bold text-green-400"
                     />
                  </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Payment Deadline (From Now)</label>
                <Select value={deadlineHours} onValueChange={setDeadlineHours}>
                  <SelectTrigger className="bg-black/40 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="48">48 hours</SelectItem>
                    <SelectItem value="72">72 hours</SelectItem>
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>
                {deadlineHours === 'custom' && (
                  <Input 
                    type="datetime-local" 
                    value={customDeadline}
                    onChange={(e) => setCustomDeadline(e.target.value)}
                    className="bg-black/40 border-zinc-700 mt-2" 
                  />
                )}
                <p className="text-xs text-zinc-500">
                  If payment is not received within this time, the slot will be released.
                </p>
              </div>

              <div className="space-y-2">
                 <label className="text-sm text-zinc-400">Custom Payment Options</label>
                 <Input 
                    placeholder={sendLinkDialog?.events.upi_id || "Enter custom UPI or Link"}
                    value={customUpiId}
                    onChange={(e) => setCustomUpiId(e.target.value)}
                    className="bg-black/40 border-zinc-700 font-mono mb-2"
                 />
                 <div className="flex items-center gap-2">
                    <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="bg-black/40 border-zinc-700 file:text-blue-400 file:bg-zinc-800"
                    />
                 </div>
                 <p className="text-xs text-zinc-500">
                    Upload a specific QR Code image (optional). If no image is uploaded, one will be generated from the UPI ID.
                 </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSendLinkDialog(null)}>Cancel</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={sendingLink === sendLinkDialog?.id}
                onClick={() => sendLinkDialog && handleSendPaymentLink(sendLinkDialog)}
              >
                {sendingLink === sendLinkDialog?.id ? 'Sending...' : 'Send Payment Link'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expire Slot Confirmation */}
        <AlertDialog open={!!expiringSlot} onOpenChange={() => setExpiringSlot(null)}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Expire Slot?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                This will expire the slot for <strong>{expiringSlot?.profiles.full_name}</strong> and send them a notification. 
                The slot will be available for the next person in queue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => expiringSlot && handleExpireSlot(expiringSlot)}
              >
                Yes, Expire Slot
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AdminLayout>
    </ProtectedRoute>
  );
}
