import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export const CapacitorGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const platform = Capacitor.getPlatform();
  const isNative = platform === 'android' || platform === 'ios';

  useEffect(() => {
    if (!isNative) return;

    const path = location.pathname;

    // 1. Redirect root to Mobile Landing Page
    if (path === '/') {
      navigate('/mobile-landing', { replace: true });
      return;
    }

    // 2. Allow both Admin and Coordinator routes
    // We no longer block /admin routes as the app now supports both roles.

    // 3. Block Public Routes (Optional - if you want STRICT coordinator only)
    // For now, we'll allow public routes but ensure root goes to login.
    // If you want to block everything except coordinator:
    /*
    if (!path.startsWith('/coordinator')) {
       navigate('/coordinator/login', { replace: true });
    }
    */

  }, [location, isNative, navigate]);

  return <>{children}</>;
};
