import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    <div className="flex flex-col gap-2 w-full">
      <img
        src={url}
        alt={alt}
        className="max-h-[70vh] max-w-full object-contain bg-black/50 rounded-lg"
      />
      <div className="flex justify-center">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline">
          Open Original
        </a>
      </div>
    </div>
  );
};

export default function FestRegistrationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchRegistration = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('fest_registrations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRegistration(data as Registration);
    } catch (error: any) {
      console.error('Error fetching registration:', error);
      toast.error('Failed to load registration');
      navigate('/admin/fest-approvals');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) fetchRegistration();
  }, [id, fetchRegistration]);

  const generateFestCode = async (): Promise<string> => {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
    const random = Math.floor(1000 + Math.random() * 9000);
    const code = `KZN26-${timestamp}${random}`;
    
    const { data } = await supabase
      .from('fest_registrations')
      .select('id')
      .eq('fest_registration_code', code)
      .single();
    
    if (data) return generateFestCode();
    return code;
  };

  const handleApprove = async () => {
    if (!registration) return;
    if (registration.fest_registration_code) {
      toast.error('Already approved');
      return;
    }

    if (!confirm(`Approve registration for ${registration.full_name}?`)) return;

    setProcessing(true);
    try {
      const festCode = await generateFestCode();

      const { error: regError } = await supabase
        .from('fest_registrations')
        .update({ 
          payment_status: 'completed',
          proof_status: 'approved',
          fest_registration_code: festCode
        })
        .eq('id', registration.id);

      if (regError) throw regError;

      if (registration.profile_id) {
        await supabase
          .from('profiles')
          .update({
            fest_payment_status: 'approved',
            is_fest_registered: true,
            fest_registration_id: festCode
          })
          .eq('id', registration.profile_id);
      }

      await supabase.functions.invoke('send-registration-email', {
        body: {
          to: registration.email,
          type: 'fest_code_approval',
          data: {
            name: registration.full_name,
            festCode: festCode
          }
        }
      });

      toast.success(`Approved! Code: ${festCode}`);
      fetchRegistration();
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to approve');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!registration) return;
    if (!confirm(`Reject registration for ${registration.full_name}?`)) return;

    setProcessing(true);
    try {
      const { error: regError } = await supabase
        .from('fest_registrations')
        .update({ 
          payment_status: 'failed',
          proof_status: 'rejected'
        })
        .eq('id', registration.id);

      if (regError) throw regError;

      if (registration.profile_id) {
        await supabase
          .from('profiles')
          .update({
            fest_payment_status: 'rejected',
            is_fest_registered: false,
            fest_registration_id: null
          })
          .eq('id', registration.profile_id);
      }

      toast.success('Registration rejected');
      fetchRegistration();
    } catch (error: any) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!registration) return null;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/fest-approvals')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-white">Registration Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Info */}
          <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-lg border border-white/10 space-y-6">
              <h3 className="text-lg font-semibold text-blue-400 border-b border-white/10 pb-2">
                Personal Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase block mb-1">Full Name</label>
                  <p className="text-xl font-medium text-white">{registration.full_name}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Email</label>
                    <p className="text-gray-300 break-all">{registration.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Phone</label>
                    <p className="text-gray-300">{registration.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-lg border border-white/10 space-y-6">
              <h3 className="text-lg font-semibold text-purple-400 border-b border-white/10 pb-2">
                Academic Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 uppercase block mb-1">College</label>
                  <p className="text-white font-medium">{registration.college}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase block mb-1">Education</label>
                  <p className="text-gray-300">{registration.education || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase block mb-1">Year</label>
                  <p className="text-gray-300">{registration.year || '-'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500 uppercase block mb-1">Branch</label>
                  <p className="text-gray-300">{registration.branch || '-'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-lg border border-white/10 space-y-6">
              <h3 className="text-lg font-semibold text-green-400 border-b border-white/10 pb-2">
                Payment Status
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase block mb-1">Account Holder</label>
                  <p className="text-lg font-medium text-white">{registration.account_holder_name || 'Not Provided'}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Payment</label>
                    <Badge variant={registration.payment_status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                      {registration.payment_status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Proof</label>
                    <Badge 
                      variant={registration.proof_status === 'approved' ? 'default' : registration.proof_status === 'rejected' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {registration.proof_status}
                    </Badge>
                  </div>
                </div>
                {registration.fest_registration_code && (
                  <div className="bg-green-900/20 p-4 rounded border border-green-500/30 mt-2">
                    <label className="text-xs text-green-500 uppercase block mb-1">Assigned Fest Code</label>
                    <p className="font-mono font-bold text-green-400 text-2xl">{registration.fest_registration_code}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Proof & Actions */}
          <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-lg border border-white/10 space-y-4">
              <h3 className="text-lg font-semibold text-yellow-400 border-b border-white/10 pb-2">
                Payment Proof
              </h3>
              <div className="min-h-[300px] flex items-center justify-center bg-black/30 rounded-lg border border-white/5 p-4">
                {registration.payment_proof_url ? (
                  <ProofViewer path={registration.payment_proof_url} alt="Payment Proof" />
                ) : (
                  <span className="text-gray-500">No proof uploaded</span>
                )}
              </div>
            </div>

            {registration.proof_status === 'pending' && (
              <div className="bg-white/5 p-6 rounded-lg border border-white/10 space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                  Actions
                </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2 h-12 text-lg"
                    onClick={handleApprove}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Approve & Send Code
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2 h-12 text-lg"
                    onClick={handleReject}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
