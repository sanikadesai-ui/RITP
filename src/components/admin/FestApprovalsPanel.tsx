import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Eye, Loader2, RefreshCw, Search, XCircle, Database, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  account_holder_name?: string;
  payment_status: string;
  payment_proof_url: string | null;
  proof_status: string;
  fest_registration_code: string | null;
  created_at: string;
  profile_id: string;
}

export default function FestApprovalsPanel() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [bulkEmailSending, setBulkEmailSending] = useState(false);
  const [emailProgress, setEmailProgress] = useState({ sent: 0, total: 0 });

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fest_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations((data as Registration[]) || []);
    } catch (error: any) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const generateFestCode = async (): Promise<string> => {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `KZN26-${timestamp}${random}`;
  };

  const handleApprove = async (reg: Registration) => {
    if (reg.fest_registration_code) {
      toast.error('Already has a fest code');
      return;
    }
    if (!confirm(`Approve ${reg.full_name}?`)) return;

    setProcessingId(reg.id);
    try {
      const festCode = await generateFestCode();

      const { error } = await supabase
        .from('fest_registrations')
        .update({ 
          payment_status: 'completed',
          proof_status: 'approved',
          fest_registration_code: festCode
        })
        .eq('id', reg.id);

      if (error) throw error;

      // Also update the profile status to keep it in sync
      if (reg.profile_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            fest_payment_status: 'approved',
            fest_registration_id: festCode
          })
          .eq('id', reg.profile_id);
          
        if (profileError) {
          console.error('Failed to sync profile status:', profileError);
        }
      }

      // Send email
      await supabase.functions.invoke('send-registration-email', {
        body: {
          to: reg.email,
          type: 'fest_code_approval',
          data: { name: reg.full_name, festCode }
        }
      });

      toast.success(`✓ Approved! Code: ${festCode}`);
      fetchRegistrations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reg: Registration) => {
    if (!confirm(`Reject ${reg.full_name}?`)) return;

    setProcessingId(reg.id);
    try {
      const { error } = await supabase
        .from('fest_registrations')
        .update({ payment_status: 'failed', proof_status: 'rejected' })
        .eq('id', reg.id);

      if (error) throw error;
      toast.success('Rejected');
      fetchRegistrations();
    } catch (error: any) {
      toast.error('Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const handleResendToAllApproved = async () => {
    const approved = registrations.filter(r => r.proof_status === 'approved' && r.fest_registration_code);
    if (approved.length === 0) {
      toast.info('No approved registrations');
      return;
    }
    if (!confirm(`Send reminder to ${approved.length} students?`)) return;

    setBulkEmailSending(true);
    setEmailProgress({ sent: 0, total: approved.length });

    let success = 0;
    for (const reg of approved) {
      try {
        await supabase.functions.invoke('send-registration-email', {
          body: {
            to: reg.email,
            type: 'fest_pass_reminder',
            data: { name: reg.full_name, festCode: reg.fest_registration_code }
          }
        });
        success++;
      } catch {}
      setEmailProgress(prev => ({ ...prev, sent: prev.sent + 1 }));
      await new Promise(r => setTimeout(r, 200));
    }

    setBulkEmailSending(false);
    toast.success(`Sent ${success}/${approved.length} emails`);
  };

  const handleSync = async () => {
    if (!confirm('This will sync approval status from Fest Registrations to User Profiles. Continue?')) return;
    
    setLoading(true);
    try {
      const approved = registrations.filter(r => r.proof_status === 'approved' && r.fest_registration_code && r.profile_id);
      let synced = 0;
      
      for (const reg of approved) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            fest_payment_status: 'approved',
            fest_registration_id: reg.fest_registration_code
          })
          .eq('id', reg.profile_id);
          
        if (!error) synced++;
      }
      
      toast.success(`Synced ${synced} profiles successfully`);
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const filtered = registrations.filter(r => {
    const search = searchTerm.toLowerCase();
    const matchSearch = r.full_name?.toLowerCase().includes(search) ||
      r.email?.toLowerCase().includes(search) ||
      r.college?.toLowerCase().includes(search);
    const matchStatus = statusFilter === 'all' || r.proof_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleResendToAllApproved} 
            variant="outline" 
            className="gap-2 bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
            disabled={bulkEmailSending}
          >
            {bulkEmailSending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {emailProgress.sent}/{emailProgress.total}</>
            ) : (
              <><Send className="w-4 h-4" /> Resend to All Approved</>
            )}
          </Button>
          <Button onClick={handleSync} variant="outline" className="gap-2 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Database className="w-4 h-4" /> Sync Data
          </Button>
          <Button onClick={fetchRegistrations} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-blue-400 text-sm">
          <strong>Workflow:</strong> When you approve a payment here, the student receives their unique Fest Registration Code via email. 
          They can then use this code to register for paid events. Use "Resend to All Approved" to remind approved students to check their status and get their Fest Pass.
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
        <div className="flex items-center gap-2 text-sm text-gray-400 px-2">
          {filtered.length} / {registrations.length}
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
              className={`capitalize ${statusFilter === status && status === 'pending' ? 'bg-yellow-600' : ''}`}
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
              <TableRow className="border-white/10">
                <TableHead className="text-gray-400">Date</TableHead>
                <TableHead className="text-gray-400">Student</TableHead>
                <TableHead className="text-gray-400">College</TableHead>
                <TableHead className="text-gray-400">Account Holder</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Proof</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                    No registrations found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((reg) => (
                  <TableRow key={reg.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-gray-300">
                      {new Date(reg.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{reg.full_name}</span>
                        <span className="text-gray-500 text-xs">{reg.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{reg.college}</TableCell>
                    <TableCell className="text-gray-300">
                      {reg.account_holder_name || <span className="text-gray-600">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        reg.proof_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        reg.proof_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }>
                        {reg.proof_status}
                      </Badge>
                      {reg.fest_registration_code && (
                        <div className="text-xs text-green-400 mt-1 font-mono">{reg.fest_registration_code}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {reg.payment_proof_url ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-400"
                          onClick={() => navigate(`/admin/fest-approvals/${reg.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                      ) : (
                        <span className="text-gray-500 text-xs">No proof</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {reg.proof_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:bg-green-400/10"
                              onClick={() => handleApprove(reg)}
                              disabled={!!processingId}
                            >
                              {processingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:bg-red-400/10"
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
  );
}
