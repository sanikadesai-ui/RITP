/**
 * Registration Ending Timer Component
 * Creates urgency by showing countdown to registration deadline
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, Flame, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

interface RegistrationEndingTimerProps {
  className?: string;
  compact?: boolean;
  onExpired?: () => void;
}

export function RegistrationEndingTimer({ 
  className = '', 
  compact = false,
  onExpired 
}: RegistrationEndingTimerProps) {
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  // Fetch registration end time from settings
  useEffect(() => {
    const fetchEndTime = async () => {
      try {
        const { data } = await (supabase.from('fest_settings' as any) as any)
          .select('registration_end_time')
          .single();
        
        if (data?.registration_end_time) {
          setEndTime(new Date(data.registration_end_time));
        }
      } catch (error) {
        console.error('Error fetching registration end time:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEndTime();
  }, []);

  // Calculate time remaining
  const calculateTimeLeft = useCallback((): TimeLeft | null => {
    if (!endTime) return null;

    const now = new Date().getTime();
    const end = endTime.getTime();
    const difference = end - now;

    if (difference <= 0) {
      setIsExpired(true);
      onExpired?.();
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      total: difference,
    };
  }, [endTime, onExpired]);

  // Update timer every second
  useEffect(() => {
    if (!endTime) return;

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [endTime, calculateTimeLeft]);

  if (loading || !endTime || !timeLeft) {
    return null;
  }

  // Determine urgency level
  const isUrgent = timeLeft.total < 24 * 60 * 60 * 1000; // Less than 24 hours
  const isCritical = timeLeft.total < 6 * 60 * 60 * 1000; // Less than 6 hours
  const isLastHour = timeLeft.total < 60 * 60 * 1000; // Less than 1 hour

  if (isExpired) {
    return (
      <div className={`bg-red-950/80 border border-red-500 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span className="font-bold text-lg">Registration Closed</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isCritical ? (
          <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
        ) : (
          <Clock className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${isCritical ? 'text-orange-400' : 'text-red-400'}`}>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="text-xs text-gray-500">left</span>
      </div>
    );
  }

  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl border p-4 sm:p-6
        ${isCritical 
          ? 'bg-gradient-to-r from-orange-950/80 via-red-950/80 to-orange-950/80 border-orange-500/50' 
          : isUrgent 
            ? 'bg-gradient-to-r from-red-950/60 to-red-900/60 border-red-500/40'
            : 'bg-gradient-to-r from-gray-900/80 to-red-950/40 border-red-500/30'
        }
        ${className}
      `}
    >
      {/* Animated background effect for urgency */}
      {isCritical && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent animate-pulse" />
      )}
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {isLastHour ? (
            <Zap className="w-5 h-5 text-yellow-400 animate-bounce" />
          ) : isCritical ? (
            <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
          ) : (
            <Clock className="w-5 h-5 text-red-500" />
          )}
          <h3 className={`
            text-sm sm:text-base font-bold uppercase tracking-wider
            ${isCritical ? 'text-orange-400' : 'text-red-400'}
          `}>
            {isLastHour 
              ? '⚡ LAST HOUR TO REGISTER!' 
              : isCritical 
                ? '🔥 HURRY! REGISTRATION CLOSING SOON' 
                : '⏰ Registration Ends In'
            }
          </h3>
          {isLastHour && (
            <Zap className="w-5 h-5 text-yellow-400 animate-bounce" />
          )}
        </div>

        {/* Countdown Display */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {/* Days */}
          {timeLeft.days > 0 && (
            <>
              <TimeUnit value={timeLeft.days} label="Days" urgent={isUrgent} />
              <span className="text-2xl sm:text-3xl text-red-500/50 font-light">:</span>
            </>
          )}
          
          {/* Hours */}
          <TimeUnit value={timeLeft.hours} label="Hours" urgent={isUrgent} critical={isCritical} />
          <span className="text-2xl sm:text-3xl text-red-500/50 font-light animate-pulse">:</span>
          
          {/* Minutes */}
          <TimeUnit value={timeLeft.minutes} label="Mins" urgent={isUrgent} critical={isCritical} />
          <span className="text-2xl sm:text-3xl text-red-500/50 font-light animate-pulse">:</span>
          
          {/* Seconds */}
          <TimeUnit value={timeLeft.seconds} label="Secs" urgent={isUrgent} critical={isCritical} pulse />
        </div>

        {/* Urgency Message */}
        {isUrgent && (
          <p className={`
            text-center text-xs sm:text-sm mt-4 font-medium
            ${isCritical ? 'text-orange-300' : 'text-red-300'}
          `}>
            {isCritical 
              ? "🚨 Don't miss out! Limited spots remaining!"
              : "⚡ Register now to secure your spot!"
            }
          </p>
        )}
      </div>
    </div>
  );
}

interface TimeUnitProps {
  value: number;
  label: string;
  urgent?: boolean;
  critical?: boolean;
  pulse?: boolean;
}

function TimeUnit({ value, label, urgent, critical, pulse }: TimeUnitProps) {
  return (
    <div className="flex flex-col items-center">
      <div 
        className={`
          relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20
          flex items-center justify-center
          rounded-lg border
          ${critical 
            ? 'bg-orange-950/80 border-orange-500/60' 
            : urgent 
              ? 'bg-red-950/80 border-red-500/50'
              : 'bg-black/60 border-red-500/30'
          }
          ${pulse ? 'animate-pulse' : ''}
        `}
      >
        <span 
          className={`
            text-2xl sm:text-3xl md:text-4xl font-bold font-mono
            ${critical ? 'text-orange-400' : 'text-red-400'}
          `}
          style={{ textShadow: critical ? '0 0 20px rgba(251, 146, 60, 0.5)' : '0 0 10px rgba(239, 68, 68, 0.3)' }}
        >
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-gray-400 mt-1 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

export default RegistrationEndingTimer;
