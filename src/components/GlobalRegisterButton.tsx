import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Lock } from 'lucide-react';

export function GlobalRegisterButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await (supabase.from('fest_settings' as any) as any).select('*').single();
      setSettings(data);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  if (loading) return <Button disabled className={className}>Loading...</Button>;

  const now = new Date();
  const start = settings?.registration_start_time ? new Date(settings.registration_start_time) : null;
  const end = settings?.registration_end_time ? new Date(settings.registration_end_time) : null;
  const isLive = settings?.is_registration_live;

  let status = 'open';
  let message = '';

  // Logic:
  // 1. If Toggle is OFF -> Closed (or Coming Soon if future?)
  // 2. If Toggle is ON -> Check Dates
  
  if (!isLive) {
      // If manually toggled off, we consider it closed or coming soon depending on if it ever started
      // But usually "Off" means "Stop everything".
      // User said: "WHEN FEST REGISTRTION FORM FILLING TIME IS ENDED THEN SHOW REGISATION IF CLOSED AND OTHER WISE SHOW COMMING SOON"
      
      if (end && now > end) {
          status = 'closed';
          message = 'Registration Closed';
      } else {
          // If not ended, but toggled off, it might be "Coming Soon" or "Paused"
          // Let's assume "Coming Soon" if before start, or just "Closed" if undefined.
          if (start && now < start) {
             status = 'coming_soon';
             message = 'Coming Soon';
          } else {
             status = 'closed';
             message = 'Registration Closed';
          }
      }
  } else {
      // Toggle is ON, check dates
      if (end && now > end) {
          status = 'closed';
          message = 'Registration Closed';
      } else if (start && now < start) {
          status = 'coming_soon';
          message = 'Coming Soon';
      }
  }

  if (status === 'closed') {
      return (
          <Button disabled className={`${className} bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-not-allowed`}>
              <Lock className="w-4 h-4 mr-2" />
              {message}
          </Button>
      );
  }

  if (status === 'coming_soon') {
      return (
          <Button disabled className={`${className} bg-yellow-900/20 text-yellow-500 border border-yellow-500/20 cursor-not-allowed`}>
              <Clock className="w-4 h-4 mr-2" />
              {message}
          </Button>
      );
  }

  const action = settings?.global_button_action || 'fest_registration';

  if (action === 'event_registration') {
    return (
      <Button 
        onClick={() => navigate('/register')}
        className={`${className} bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-900/20`}
      >
        Event Registration
      </Button>
    );
  }

  return (
    <Button 
      onClick={() => navigate('/fest-registration')}
      className={`${className} bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white shadow-lg shadow-red-900/20`}
    >
      Fest Registration
    </Button>
  );
}
