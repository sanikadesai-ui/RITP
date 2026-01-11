import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Zap } from 'lucide-react';

interface RegistrationNotification {
    id: string;
    studentName: string;
    dept: string;
    eventName: string;
    timestamp: Date;
}

export const SocialProof = () => {
    const [notifications, setNotifications] = useState<RegistrationNotification[]>([]);
    const [currentNotification, setCurrentNotification] = useState<RegistrationNotification | null>(null);

    // Initial fetch of recent registrations + Realtime subscription
    useEffect(() => {
        const fetchRecentRegistrations = async () => {
            try {
                // Fetch last 10 registrations with profile and event data
                const { data, error } = await supabase
                    .from('registrations')
                    .select(`
                        id,
                        created_at,
                        profiles (full_name, department),
                        events (name)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                if (error) {
                    console.error('Error fetching social proof:', error);
                    return;
                }

                if (data && data.length > 0) {
                    const mapped: RegistrationNotification[] = data.map((reg: any) => ({
                        id: reg.id,
                        studentName: reg.profiles?.full_name?.split(' ')[0] || 'Student',
                        dept: reg.profiles?.department || 'RIT',
                        eventName: reg.events?.name || 'KAIZEN',
                        timestamp: new Date(reg.created_at)
                    }));
                    setNotifications(mapped);
                }
            } catch (err) {
                console.error("Social proof fetch failed", err);
            }
        };

        fetchRecentRegistrations();

        // Subscribe to NEW registrations in real-time
        const channel = supabase
            .channel('public:registrations')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'registrations' },
                async (payload) => {
                    const { data } = await supabase
                        .from('registrations')
                        .select(`id, created_at, profiles (full_name, department), events (name)`)
                        .eq('id', payload.new.id)
                        .maybeSingle();

                   if (data) {
                        const newNotif: RegistrationNotification = {
                            id: data.id,
                            studentName: (data as any).profiles?.full_name?.split(' ')[0] || 'Someone',
                            dept: (data as any).profiles?.department || 'College',
                            eventName: (data as any).events?.name || 'an Event',
                            timestamp: new Date()
                        };
                        setNotifications(prev => [newNotif, ...prev]);
                        setCurrentNotification(newNotif);
                        
                        // Clear immediate notification after 5s
                        setTimeout(() => {
                             setCurrentNotification(null);
                        }, 5000);
                   }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Random cycling only if we aren't already showing a realtime one
    useEffect(() => {
        if (notifications.length === 0) return;

        const interval = setInterval(() => {
            // Only show random one if not currently showing one
            if (!currentNotification) {
                const random = notifications[Math.floor(Math.random() * notifications.length)];
                setCurrentNotification(random);
                
                setTimeout(() => {
                    setCurrentNotification(null);
                }, 5000); // Show for 5s
            }
        }, 12000 + Math.random() * 5000); // Random interval between 12-17s

        return () => clearInterval(interval);
    }, [notifications, currentNotification]);

    return (
        <div className="fixed bottom-6 left-6 z-[60] pointer-events-none hidden md:block">
            <AnimatePresence mode="wait">
                {currentNotification && (
                    <motion.div
                        key={currentNotification.id + Date.now()} // Force re-render for same item
                        initial={{ opacity: 0, y: 50, x: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="pointer-events-auto bg-zinc-950/90 backdrop-blur-xl border border-red-500/20 p-4 rounded-xl shadow-2xl shadow-black/50 flex items-center gap-4 max-w-sm"
                    >
                        <div className="relative shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                             <Zap className="w-5 h-5 text-red-500 fill-red-500/20" />
                             <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                             </span>
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <span className="truncate text-zinc-100 max-w-[120px]">{currentNotification.studentName}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/30 shrink-0">New</span>
                            </h4>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                                Registered for <span className="text-red-300 font-medium">{currentNotification.eventName}</span>
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
