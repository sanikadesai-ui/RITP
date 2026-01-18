import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, Zap, CheckCircle2, ArrowLeft, Shirt, Sparkles, Star } from 'lucide-react';
import { AtmosphericBackground } from '@/components/AtmosphericBackground';
import { useNavigate } from 'react-router-dom';
import { generateUUID as uuid } from '@/utils/uuid';

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;
const TSHIRT_PRICE = 200;

export default function TshirtOrder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bucketReady, setBucketReady] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    college: '',
    tshirt_size: '',
    quantity: 1,
    account_holder_name: '',
    file: null as File | null,
  });

  const [paymentSettings, setPaymentSettings] = useState({
    upiId: '',
    qrCodeUrl: ''
  });

  const MAX_FILE_SIZE = 500 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg', 'image/webp'];

  useEffect(() => {
    checkBucket();
    fetchSettings();
  }, []);

  const checkBucket = async () => {
    try {
      const { error } = await supabase.storage.from('proof-uploads').list('', { limit: 1 });
      if (error) {
        const msg = (error as any)?.message || String(error);
        if (msg.toLowerCase().includes('bucket not found')) {
          setBucketReady(false);
          toast.error('Storage bucket missing. Please contact support.');
          return;
        }
      }
      setBucketReady(true);
    } catch (e) {
      setBucketReady(true);
    }
  };

  const fetchSettings = async () => {
    try {
      // Try to get tshirt-specific settings first, fallback to fest settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .in('key', ['tshirt_upi_id', 'tshirt_qr_code_url', 'fest_upi_id', 'fest_qr_code_url']);

      if (settingsData) {
        const settings: any = {};
        settingsData.forEach((item: any) => {
          settings[item.key] = item.value;
        });
        
        // Use tshirt-specific settings if available, otherwise fallback to fest settings
        setPaymentSettings({
          upiId: (settings['tshirt_upi_id'] || settings['fest_upi_id'] || '').replace(/"/g, ''),
          qrCodeUrl: (settings['tshirt_qr_code_url'] || settings['fest_qr_code_url'] || '').replace(/"/g, '')
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const onChange = (key: keyof typeof form, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleUpload = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      if (file.size > MAX_FILE_SIZE) { toast.error('File too large (maximum 500KB)'); return null; }
      
      const fileType = file.type;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const isValidType = ALLOWED_TYPES.includes(fileType) || 
                          (fileExtension && ['jpg', 'jpeg', 'png', 'pdf', 'webp'].includes(fileExtension));

      if (!isValidType) { toast.error('Unsupported file type (JPG/PNG/PDF only)'); return null; }
      const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\s+/g, '_');
      const path = `tshirt-proofs/${uuid()}_${safeBase}`;
      const { error } = await supabase.storage.from('proof-uploads').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload proof');
        return null;
      }
      return path;
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const required = ['full_name', 'email', 'phone', 'college', 'tshirt_size', 'account_holder_name'] as const;
      for (const k of required) {
        if (!(form as any)[k]) { 
          toast.error('Please fill all required fields'); 
          setLoading(false); 
          return; 
        }
      }

      if (!form.file) {
        toast.error('Payment proof is required. Please upload a screenshot.');
        setLoading(false);
        return;
      }

      let proofPath: string | null = null;
      if (form.file) {
        if (!bucketReady) { toast.error('Storage not ready. Please try again later.'); setLoading(false); return; }
        proofPath = await handleUpload(form.file);
        if (!proofPath) { setLoading(false); return; }
      }

      const { data, error } = await supabase.rpc('register_tshirt_order' as any, {
        p_full_name: form.full_name,
        p_email: form.email.toLowerCase().trim(),
        p_phone: form.phone,
        p_college: form.college,
        p_tshirt_size: form.tshirt_size,
        p_quantity: form.quantity,
        p_account_holder_name: form.account_holder_name,
        p_payment_proof_url: proofPath,
      }) as any;

      if (error) {
        throw error;
      }
      if (data && data.success === false) { throw new Error(data.message || 'Order failed'); }
      
      toast.success('Order submitted! We will verify your payment.');
      setForm({ full_name: '', email: '', phone: '', college: '', tshirt_size: '', quantity: 1, account_holder_name: '', file: null });
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('Submit error:', err);
      toast.error(err.message || 'Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-black relative flex items-center justify-center p-4">
        <AtmosphericBackground />
        
        <div className="relative z-10 w-full max-w-2xl animate-in fade-in zoom-in duration-500">
          <div className="bg-black/60 backdrop-blur-xl border border-green-500/30 rounded-2xl p-8 md:p-12 shadow-2xl text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-700 delay-150">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Order Submitted!
            </h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-medium mb-6">
              <Shirt className="w-4 h-4" /> Status: Pending Verification
            </div>
            
            <div className="space-y-4 text-zinc-300 mb-8">
              <p className="text-lg">
                Thank you for ordering the exclusive Kaizen T-shirt!
              </p>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left space-y-4">
                <h4 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" /> What's Next?
                </h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/30">1</div>
                    <div>
                      <p className="text-white font-medium">Payment Verification</p>
                      <p className="text-sm text-zinc-400">We will verify your payment proof within 24-48 hours.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/30">2</div>
                    <div>
                      <p className="text-white font-medium">Order Confirmation</p>
                      <p className="text-sm text-zinc-400">You'll receive an email with your order confirmation code.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold border border-green-500/30">3</div>
                    <div>
                      <p className="text-white font-medium">Collect Your T-shirt</p>
                      <p className="text-sm text-zinc-400">Pick up your exclusive Kaizen T-shirt at the fest venue.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/')}
                className="bg-white text-black hover:bg-zinc-200"
              >
                Back to Home
              </Button>
              <Button 
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Place Another Order
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center p-4 py-12">
      <AtmosphericBackground />
      
      <div className="relative z-10 w-full max-w-5xl animate-in fade-in zoom-in duration-500">
        <Button 
          onClick={() => navigate('/')}
          variant="ghost" 
          className="mb-6 text-white/60 hover:text-white hover:bg-white/10 pl-0 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* T-shirt Preview Section */}
          <div className="bg-black/60 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 md:p-8 shadow-2xl order-2 lg:order-1">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 mb-2 flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
                Exclusive Kaizen Merch
              </h2>
              <p className="text-zinc-400">Limited Edition Stranger Things Collection</p>
            </div>

            {/* T-shirt Image Container */}
            <div className="relative group">
              {/* Glow Effect */}
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-red-500/20 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
              
              {/* Image Frame */}
              <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden border border-white/10">
                {/* Loading Skeleton */}
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />
                )}
                
                <img 
                  src="/T-shirt.jpeg" 
                  alt="Kaizen Exclusive T-shirt" 
                  className={`w-full h-auto object-cover transition-all duration-700 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} group-hover:scale-105`}
                  onLoad={() => setImageLoaded(true)}
                />

                {/* Stranger Things Style Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                
                {/* Floating particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full bg-red-500/30 blur-[2px]"
                      style={{
                        width: Math.random() * 4 + 2 + 'px',
                        height: Math.random() * 4 + 2 + 'px',
                        left: Math.random() * 100 + '%',
                        top: Math.random() * 100 + '%',
                        animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
                        animationDelay: -Math.random() * 5 + 's',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-950/30 to-purple-950/30 rounded-xl border border-cyan-500/20">
                <div>
                  <p className="text-zinc-400 text-sm">Price per T-shirt</p>
                  <p className="text-3xl font-bold text-cyan-400">₹{TSHIRT_PRICE}</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-400 text-sm">Available Sizes</p>
                  <p className="text-white font-medium">XS - XXXL</p>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Star, text: 'Premium Cotton' },
                  { icon: Sparkles, text: 'Limited Edition' },
                  { icon: Shirt, text: 'Unisex Fit' },
                  { icon: Zap, text: 'Exclusive Design' },
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                    <feature.icon className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-zinc-300">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Form Section */}
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl order-1 lg:order-2">
            <div className="text-center mb-6">
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600 mb-2">
                Order T-shirt
              </h1>
              <p className="text-zinc-400">Get your exclusive Kaizen merchandise</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-1 h-5 bg-cyan-500 rounded-full" /> Your Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Full Name *</Label>
                    <Input 
                      required
                      value={form.full_name} 
                      onChange={e => onChange('full_name', e.target.value)}
                      className="bg-black/40 border-white/10 text-white focus:border-cyan-500"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Email *</Label>
                    <Input 
                      required
                      type="email" 
                      value={form.email} 
                      onChange={e => onChange('email', e.target.value)}
                      className="bg-black/40 border-white/10 text-white focus:border-cyan-500"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Phone *</Label>
                    <Input 
                      required
                      value={form.phone} 
                      onChange={e => onChange('phone', e.target.value)}
                      className="bg-black/40 border-white/10 text-white focus:border-cyan-500"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">College *</Label>
                    <Input 
                      required
                      value={form.college} 
                      onChange={e => onChange('college', e.target.value)}
                      className="bg-black/40 border-white/10 text-white focus:border-cyan-500"
                      placeholder="Your college name"
                    />
                  </div>
                </div>
              </div>

              {/* Size Selection */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-1 h-5 bg-purple-500 rounded-full" /> Select Size
                </h3>

                <div className="space-y-2">
                  <Label className="text-zinc-300">T-Shirt Size *</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {TSHIRT_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          onChange('tshirt_size', size);
                          setSelectedSize(size);
                        }}
                        className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-300 ${
                          form.tshirt_size === size
                            ? 'bg-cyan-500 border-cyan-400 text-black shadow-lg shadow-cyan-500/30'
                            : 'bg-black/40 border-white/20 text-white hover:border-cyan-500/50 hover:bg-cyan-950/30'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-1 h-5 bg-green-500 rounded-full" /> Payment
                </h3>

                <div className="bg-gradient-to-br from-green-900/20 to-black p-5 rounded-xl border border-green-500/20">
                  <div className="mb-4 text-center">
                    <p className="text-zinc-300 mb-1">Amount to Pay</p>
                    <div className="text-3xl font-bold text-green-500">₹{TSHIRT_PRICE}</div>
                  </div>

                  <div className="space-y-4">
                    {paymentSettings.qrCodeUrl && (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-zinc-300 font-semibold text-sm">Scan to Pay via UPI</p>
                        <div className="bg-white p-3 rounded-lg">
                          <img src={paymentSettings.qrCodeUrl} alt="UPI QR Code" className="w-36 h-36 object-contain"/>
                        </div>
                      </div>
                    )}

                    {paymentSettings.upiId && (
                      <div className="text-center">
                        <p className="text-zinc-400 text-xs mb-1">Or transfer to UPI ID</p>
                        <div className="flex items-center justify-center gap-2 bg-green-950/30 p-2 rounded-lg border border-green-900/50">
                          <code className="text-green-300 font-mono text-sm">{paymentSettings.upiId}</code>
                          <button type="button" onClick={() => { navigator.clipboard.writeText(paymentSettings.upiId); toast.success('UPI ID copied!'); }} className="text-green-400 hover:text-green-300 text-xs">Copy</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-zinc-300">Account Holder Name *</Label>
                  <Input 
                    required
                    value={form.account_holder_name} 
                    onChange={e => onChange('account_holder_name', e.target.value)}
                    className="bg-black/40 border-white/10 text-white focus:border-green-500"
                    placeholder="Name as per UPI App"
                  />
                </div>

                {/* Proof Upload */}
                <div className="space-y-2">
                  <label className="text-zinc-300 font-medium flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4" />
                    Payment Screenshot *
                  </label>
                  <p className="text-xs text-zinc-500">Max 500KB, JPG/PNG/PDF</p>
                  
                  <div className="relative">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={e => onChange('file', e.target.files?.[0] || null)}
                      className="hidden"
                      id="proof-upload"
                    />
                    
                    <label
                      htmlFor="proof-upload"
                      className={`flex items-center justify-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                        form.file
                          ? 'border-green-500 bg-green-950/20'
                          : 'border-white/20 bg-black/40 hover:border-green-500/50'
                      }`}>
                      {form.file ? (
                        <>
                          <FileText className="w-4 h-4 text-green-500" />
                          <span className="text-green-300 font-medium text-sm truncate max-w-[200px]">{form.file.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-zinc-400" />
                          <span className="text-zinc-400 text-sm">Click to upload</span>
                        </>
                      )}
                    </label>
                  </div>

                  {form.file && (
                    <button
                      type="button"
                      onClick={() => onChange('file', null)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading || uploading}
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-lg shadow-cyan-900/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Shirt className="w-5 h-5" /> Place Order - ₹{TSHIRT_PRICE}
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
