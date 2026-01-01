import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, ShieldCheck, Lock, Mail, ArrowRight, RefreshCw } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { adminUser, loading: authLoading } = useAdminAuth();

  useEffect(() => {
    // Strict Security: If user is authenticated but we don't have OTP state (e.g. refresh or bypass),
    // force them to log out so they must verify OTP again.
    if (!authLoading && adminUser) {
      if (!loginInProgress && !otpSent) {
        console.log("Session exists but OTP not verified. Forcing logout for security.");
        supabase.auth.signOut();
      }
    }
  }, [adminUser, authLoading, loginInProgress, otpSent]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const sendOtp = async (emailToSend: string) => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    
    // Start timer for resend
    setResendTimer(30);

    console.log("Sending OTP to:", emailToSend); // Debug log

    const { error: emailError } = await supabase.functions.invoke('send-registration-email', {
      body: {
        to: emailToSend,
        type: 'admin_otp',
        data: {
          otp: newOtp,
          name: 'Admin',
          // Fallback message for when the Edge Function hasn't been redeployed yet
          message: `Your Admin Login Verification Code is: ${newOtp}`,
        }
      }
    });

    if (emailError) throw emailError;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginInProgress(true);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        throw new Error('Unauthorized: Admin access required');
      }

      await sendOtp(email);

      setOtpSent(true);
      toast({
        title: 'OTP Sent',
        description: 'Please check your email for the verification code.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Login error:', err);
      toast({
        title: 'Login failed',
        description: err.message || 'Login failed',
        variant: 'destructive',
      });
      // If we failed after password auth but before OTP, ensure we sign out
      await supabase.auth.signOut();
      setLoginInProgress(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await sendOtp(email);
      toast({
        title: 'OTP Resent',
        description: 'A new verification code has been sent to your email.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: 'Failed to resend OTP',
        description: err.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (otp !== generatedOtp) {
        throw new Error('Invalid OTP');
      }

      toast({
        title: 'Login successful',
        description: 'Welcome to KAIZEN Admin Panel',
      });
      setLoginInProgress(false);
      navigate('/admin/dashboard');
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: 'Verification failed',
        description: err.message || 'Invalid OTP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black text-white font-sans selection:bg-red-500/30">
      {/* Premium Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-black to-black" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
        
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[128px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-[128px] animate-pulse duration-[5000ms] delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-700 slide-in-from-bottom-4">
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/5">
          
          {/* Header */}
          <div className="text-center mb-10 space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 mb-6 shadow-lg shadow-red-900/30 transform hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Admin Portal
            </h1>
            <p className="text-zinc-400 text-sm">
              Secure access for KAIZEN administrators
            </p>
          </div>

          {!otpSent ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold ml-1">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-red-500 focus:ring-red-500/20 h-11 transition-all rounded-lg"
                      placeholder="admin@kaizen-ritp.in"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold ml-1">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-red-500 focus:ring-red-500/20 h-11 transition-all rounded-lg"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold h-12 rounded-lg shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="text-center space-y-2">
                <div className="text-sm text-zinc-400">
                  We've sent a 6-digit code to
                </div>
                <div className="font-medium text-white bg-zinc-800/50 py-1 px-3 rounded-full inline-block text-sm border border-zinc-700">
                  {email}
                </div>
              </div>

              <div className="flex justify-center py-4">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="w-12 h-14 text-xl font-bold bg-zinc-900/50 border-zinc-700 text-white rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold h-12 rounded-lg shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Access'
                  )}
                </Button>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                    onClick={() => {
                      setOtpSent(false);
                      setLoginInProgress(false);
                      setOtp('');
                    }}
                  >
                    Back to Login
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={resendTimer > 0 || loading}
                    onClick={handleResendOtp}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendTimer > 0 ? (
                      <span className="flex items-center gap-2 text-zinc-500">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Resend in {resendTimer}s
                      </span>
                    ) : (
                      'Resend Code'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
        
        <div className="mt-8 text-center space-y-4">
          <p className="text-zinc-500 text-xs tracking-widest uppercase">
            KAIZEN 2026 • Secure Admin Environment
          </p>
        </div>
      </div>
    </div>
  );
}