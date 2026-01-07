import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-red-950/20 to-black" />
      <div className="absolute inset-0 opacity-10" 
           style={{ background: 'radial-gradient(circle at center, #8B0000 0%, transparent 70%)' }} />

      <div className="relative z-10 w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-red-900/20 border border-red-500/30 animate-pulse">
              <Smartphone className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-red-500" style={{ fontFamily: 'Cinzel, serif' }}>
            KAIZEN STAFF
          </h1>
          <p className="text-red-200/60">Select your role to continue</p>
        </div>

        <div className="space-y-4 pt-4">
          <Button
            onClick={() => navigate('/admin/login')}
            className="w-full h-16 text-lg bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 hover:border-red-500/50 transition-all group"
          >
            <Shield className="w-6 h-6 mr-3 text-red-500 group-hover:text-red-400" />
            <div className="flex flex-col items-start">
              <span className="font-bold">Admin Portal</span>
              <span className="text-xs text-red-400/50 font-normal">Manage events & approvals</span>
            </div>
          </Button>

          <Button
            onClick={() => navigate('/coordinator/login')}
            className="w-full h-16 text-lg bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 hover:border-red-500/50 transition-all group"
          >
            <Users className="w-6 h-6 mr-3 text-red-500 group-hover:text-red-400" />
            <div className="flex flex-col items-start">
              <span className="font-bold">Coordinator Portal</span>
              <span className="text-xs text-red-400/50 font-normal">Scan tickets & manage attendees</span>
            </div>
          </Button>
        </div>

        <p className="text-xs text-red-900/40 pt-8">
          Kaizen 2026 • RITP
        </p>
      </div>
    </div>
  );
}
