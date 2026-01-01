import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Eye, Loader2, RefreshCw, Search, XCircle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  education?: string;
  year?: string;
  branch?: string;
  account_holder_name?: string;
  payment_status: string;
  payment_proof_url: string | null;
  proof_status: string;
  fest_registration_code: string | null;
  created_at: string;
  profile_id: string;
}

const ProofViewer = ({ path, alt }: { path: string; alt: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) return;
    if (path.startsWith('http')) {
      setUrl(path);
      return;
    }
    
    // Clean path: remove 'proof-uploads/' prefix if present, as createSignedUrl expects relative path
    const cleanPath = path.replace(/^proof-uploads\//, '');
    
    supabase.storage.from('proof-uploads').createSignedUrl(cleanPath, 3600)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error signing URL:', error);
          setError(true);
        } else if (data?.signedUrl) {
          setUrl(data.signedUrl);
        }
      })
      .catch(err => {
        console.error('Exception signing URL:', err);
        setError(true);
      });
  }, [path]);

  if (error) return <div className="text-red-500 text-sm p-4">Failed to load proof. <br/>Path: {path}</div>;
  if (!url) return <div className="flex justify-center p-4"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col gap-2">
      <img
        src={url}
        alt={alt}
        className="max-h-[70vh] object-contain bg-black/50 rounded-lg"
      />
      <div className="flex justify-center">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline">
          Open Original
        </a>
      </div>
    </div>
  );
};

export default function FestApprovals() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchRegistrations();

    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fest_registrations'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchRegistrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      // Fetch from new fest_registrations table
      const { data, error } = await supabase
        .from('fest_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRegistrations((data as Registration[]) || []);
    } catch (error: any) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Generate a unique fest code with timestamp component for uniqueness
  const generateFestCode = async (): Promise<string> => {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
    const random = Math.floor(1000 + Math.random() * 9000);
    const code = `KZN26-${timestamp}${random}`;
    
    // Verify uniqueness
    const { data } = await supabase
      .from('fest_registrations')
      .select('id')
      .eq('fest_registration_code', code)
      .single();
    
    // If code exists, recursively generate a new one
    if (data) {
      return generateFestCode();
    }
    
    return code;
  };

  const handleApprove = async (reg: Registration) => {
    // Check if already approved
    if (reg.fest_registration_code) {
      toast.error('This student already has a fest code assigned.');
      return;
    }

    if (!confirm(`Approve registration for ${reg.full_name}?\n\nThis will send them their unique Fest Registration Code via email.`)) return;

    setProcessingId(reg.id);
    try {
      const festCode = await generateFestCode();

      // 1. Update fest_registrations with payment status and fest code
      const { error: regError } = await supabase
        .from('fest_registrations')
        .update({ 
          payment_status: 'completed',
          proof_status: 'approved',
          fest_registration_code: festCode
        })
        .eq('id', reg.id);

      if (regError) throw regError;

      // 2. Update Profile with Fest Code (PRIMARY SOURCE OF TRUTH for other parts of app)
      if (reg.profile_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            fest_payment_status: 'approved',
            is_fest_registered: true,
            fest_registration_id: festCode
          })
          .eq('id', reg.profile_id);
          
        if (profileError) {
          console.error('Error updating profile:', profileError);
          // Don't return here, as the main registration is approved
        }
      }

      // 3. Send Email with Fest Code
      const { error: emailError } = await supabase.functions.invoke('send-registration-email', {
        body: {
          to: reg.email,
          type: 'fest_code_approval',
          data: {
            name: reg.full_name,
            festCode: festCode
          }
        }
      });

      if (emailError) {
        console.error('Email sending failed:', emailError);
        toast.warning(`Approved! Code: ${festCode} - but email failed to send. Please notify user manually.`);
      } else {
        toast.success(`✓ Approved! Code: ${festCode} sent to ${reg.email}`);
      }

      fetchRegistrations();

    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleResendEmail = async (reg: Registration) => {
    if (!reg.fest_registration_code) {
      toast.error('No Fest Code found. Approve first.');
      return;
    }
    if (!confirm(`Resend email to ${reg.email}?`)) return;

    setProcessingId(reg.id);
    try {
      const { error: emailError } = await supabase.functions.invoke('send-registration-email', {
        body: {
          to: reg.email,
          type: 'fest_code_approval',
          data: {
            name: reg.full_name,
            festCode: reg.fest_registration_code
          }
        }
      });

      if (emailError) throw emailError;
      toast.success('Email resent successfully!');
    } catch (err: any) {
      console.error('Resend error:', err);
      toast.error('Failed to resend email: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reg: Registration) => {
    if (!confirm(`Reject registration for ${reg.full_name}?`)) return;

    setProcessingId(reg.id);
    try {
      // 1. Update fest_registrations
      const { error: regError } = await supabase
        .from('fest_registrations')
        .update({ 
          payment_status: 'failed',
          proof_status: 'rejected'
        })
        .eq('id', reg.id);

      if (regError) throw regError;

      // 2. Update Profile
      if (reg.profile_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            fest_payment_status: 'rejected',
            is_fest_registered: false,
            fest_registration_id: null
          })
          .eq('id', reg.profile_id);
          
        if (profileError) console.warn('Error updating profile:', profileError);
      }

      toast.success('Registration rejected');
      fetchRegistrations();
    } catch (error: any) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRegistrations = registrations.filter(r => {
    const matchesSearch =
      r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.college?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.proof_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Fest Approvals</h1>
            <p className="text-gray-400">Verify fest payments & send unique registration codes to students</p>
          </div>
          <Button onClick={fetchRegistrations} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            <strong>Workflow:</strong> When you approve a payment here, the student receives their unique Fest Registration Code via email. 
            They can then use this code to register for paid events.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, college..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-black/50 border-white/10 text-white"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-gray-400 hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-gray-400">Student</TableHead>
                  <TableHead className="text-gray-400 hidden lg:table-cell">College</TableHead>
                  <TableHead className="text-gray-400 hidden xl:table-cell">Account Holder</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Proof</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                      No registrations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((reg) => (
                    <TableRow key={reg.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-gray-300 hidden md:table-cell">
                        {new Date(reg.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{reg.full_name}</span>
                          <span className="text-gray-500 text-xs">{reg.email}</span>
                          <span className="text-gray-500 text-xs md:hidden">{reg.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 hidden lg:table-cell">{reg.college}</TableCell>
                      <TableCell className="text-gray-300 hidden xl:table-cell">
                        {reg.account_holder_name || <span className="text-gray-600 italic">Not provided</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            reg.proof_status === 'approved' ? 'default' :
                              reg.proof_status === 'rejected' ? 'destructive' : 'secondary'
                          }
                          className={
                            reg.proof_status === 'approved' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' :
                              reg.proof_status === 'rejected' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
                                'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                          }
                        >
                          {reg.proof_status}
                        </Badge>
                        {reg.fest_registration_code && (
                          <div className="text-xs text-green-400 mt-1 font-mono">
                            {reg.fest_registration_code}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {reg.payment_proof_url ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                                <Eye className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">View</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-3xl w-[95vw]">
                              <DialogHeader>
                                <DialogTitle>Payment Proof - {reg.full_name}</DialogTitle>
                              </DialogHeader>
                              <div className="mt-4 flex justify-center bg-black/50 p-4 rounded-lg">
                                <ProofViewer path={reg.payment_proof_url} alt="Payment Proof" />
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-gray-500 text-xs">No proof</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/10">
                                <Info className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                  <Info className="w-5 h-5 text-blue-400" />
                                  Registration Dashboard
                                </DialogTitle>
                              </DialogHeader>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {/* Left Column: Student & Academic Info */}
                                <div className="space-y-6">
                                  <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                                    <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider border-b border-white/10 pb-2">
                                      Personal Information
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                      <div>
                                        <label className="text-xs text-gray-500 uppercase block mb-1">Full Name</label>
                                        <p className="font-medium text-lg">{reg.full_name}</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-xs text-gray-500 uppercase block mb-1">Email</label>
                                          <p className="text-sm text-gray-300 break-all">{reg.email}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-500 uppercase block mb-1">Phone</label>
                                          <p className="text-sm text-gray-300">{reg.phone}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                                    <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider border-b border-white/10 pb-2">
                                      Academic Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="col-span-2">
                                        <label className="text-xs text-gray-500 uppercase block mb-1">College</label>
                                        <p className="font-medium">{reg.college}</p>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500 uppercase block mb-1">Education</label>
                                        <p className="text-sm text-gray-300">{reg.education || '-'}</p>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500 uppercase block mb-1">Year</label>
                                        <p className="text-sm text-gray-300">{reg.year || '-'}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <label className="text-xs text-gray-500 uppercase block mb-1">Branch</label>
                                        <p className="text-sm text-gray-300">{reg.branch || '-'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Column: Payment & Proof */}
                                <div className="space-y-6">
                                  <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                                    <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider border-b border-white/10 pb-2">
                                      Payment Details
                                    </h3>
                                    <div className="space-y-4">
                                      <div>
                                        <label className="text-xs text-gray-500 uppercase block mb-1">Account Holder Name</label>
                                        <p className="font-medium text-xl text-white bg-black/30 p-2 rounded border border-white/10">
                                          {reg.account_holder_name || <span className="text-gray-500 italic">Not Provided</span>}
                                        </p>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-xs text-gray-500 uppercase block mb-1">Payment Status</label>
                                          <Badge variant={reg.payment_status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                                            {reg.payment_status}
                                          </Badge>
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-500 uppercase block mb-1">Proof Status</label>
                                          <Badge 
                                            variant={reg.proof_status === 'approved' ? 'default' : reg.proof_status === 'rejected' ? 'destructive' : 'secondary'}
                                            className="capitalize"
                                          >
                                            {reg.proof_status}
                                          </Badge>
                                        </div>
                                      </div>

                                      {reg.fest_registration_code && (
                                        <div className="bg-green-900/20 p-3 rounded border border-green-500/30 mt-2">
                                          <label className="text-xs text-green-500 uppercase block mb-1">Assigned Fest Code</label>
                                          <div className="flex items-center justify-between">
                                            <p className="font-mono font-bold text-green-400 text-lg">{reg.fest_registration_code}</p>
                                            <Button 
                                              size="sm" 
                                              variant="ghost" 
                                              className="h-6 text-xs text-green-400 hover:text-green-300"
                                              onClick={() => handleResendEmail(reg)}
                                            >
                                              Resend Email
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-4">
                                    <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider border-b border-white/10 pb-2">
                                      Payment Proof
                                    </h3>
                                    <div className="min-h-[200px] flex items-center justify-center bg-black/30 rounded-lg border border-white/5">
                                      {reg.payment_proof_url ? (
                                        <ProofViewer path={reg.payment_proof_url} alt="Payment Proof" />
                                      ) : (
                                        <span className="text-gray-500 text-sm">No proof uploaded</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                                {reg.proof_status === 'pending' && (
                                  <>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleReject(reg)}
                                      disabled={!!processingId}
                                      className="gap-2"
                                    >
                                      {processingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                      Reject
                                    </Button>
                                    <Button
                                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                      onClick={() => handleApprove(reg)}
                                      disabled={!!processingId}
                                    >
                                      {processingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                      Approve & Send Code
                                    </Button>
                                  </>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          {reg.proof_status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                onClick={() => handleApprove(reg)}
                                disabled={!!processingId}
                              >
                                {processingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                onClick={() => handleReject(reg)}
                                disabled={!!processingId}
                              >
                                {processingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
