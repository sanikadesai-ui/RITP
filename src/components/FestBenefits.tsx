import { Gift, Coffee, BookOpen, Utensils, Bus, Music, Ticket, Sparkles, Star, Trophy, Award, Zap, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FestBenefitsProps {
  className?: string;
  compact?: boolean;
}

const staticBenefits = [
  {
    icon: Ticket,
    title: '3 Events FREE Access',
    description: 'Participate in any 3 events of your choice without extra fees. Save big!',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/40',
    stat: 'Worth ₹150+',
  },
  {
    icon: Bus,
    title: 'Free Transportation',
    description: 'Complimentary bus service from Lohegaon bus stand to RITP Campus.',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/40',
    stat: 'Hassle-free',
  },
  {
    icon: Utensils,
    title: 'Free Breakfast & Tea',
    description: 'Start your event day with complimentary breakfast and tea.',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/40',
    stat: 'Delicious!',
  },
  {
    icon: Music,
    title: 'DJ & Enjoyment Night',
    description: 'Exclusive access to the grand finale DJ night. Celebrate your victory!',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/40',
    stat: 'Unforgettable',
  },
];

export const FestBenefits = ({ className, compact = false }: FestBenefitsProps) => {
  const [stats, setStats] = useState({
      eventCount: 20,
      participantCount: 500,
      prizePool: '50k'
  });

  useEffect(() => {
      const fetchStats = async () => {
          try {
              const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
              const { count: participantsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
              
              const { data: events } = await supabase.from('events').select('prize_pool');
              const totalPrize = events?.reduce((sum, e) => sum + (e.prize_pool || 0), 0) || 0;
              
              setStats({
                  eventCount: eventsCount || 20,
                  participantCount: participantsCount || 500,
                  prizePool: totalPrize > 0 ? `${(totalPrize/1000).toFixed(0)}k` : '50k'
              });
          } catch (e) {
              console.error("Failed to fetch benefit stats", e);
          }
      };
      
      fetchStats();
  }, []);

  return (
    <section className={cn("relative py-12 px-4 overflow-hidden", className)}>
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-fuchsia-950/5 to-black pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6 }}
             className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/30 border border-red-500/30 backdrop-blur-md mb-6"
           >
             <Gem className="w-4 h-4 text-red-400" />
             <span className="text-sm font-medium text-red-200">Exclusive VIP Perks</span>
           </motion.div>
           
           <motion.h2 
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.5, delay: 0.1 }}
             className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-200 via-white to-red-200 mb-4 tracking-tight"
             style={{ fontFamily: 'Cinzel, serif' }}
           >
             Fest Pass Benefits
           </motion.h2>
           
           <motion.p 
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="text-lg text-red-200/60 max-w-2xl mx-auto"
           >
             One Pass. Limitless Experience. Unlock the full potential of KAIZEN 2026.
           </motion.p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
          {staticBenefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-6 border bg-black/40 backdrop-blur-sm transition-all duration-300",
                benefit.borderColor
              )}
            >
              {/* Hover Glow */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br",
                benefit.bgColor.replace('/10', '/30')
              )} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                  benefit.bgColor
                )}>
                  <benefit.icon className={cn("w-6 h-6", benefit.color)} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-red-200 transition-colors">
                  {benefit.title}
                </h3>
                
                <p className="text-sm text-gray-400 mb-4 flex-grow leading-relaxed">
                  {benefit.description}
                </p>
                
                <div className={cn(
                  "inline-flex self-start items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider",
                  benefit.bgColor,
                  benefit.color
                )}>
                  <Sparkles className="w-3 h-3" />
                  {benefit.stat}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Live Stats Bar */}
        <div className="grid grid-cols-3 gap-4 border-t border-red-900/30 pt-8">
            <StatsItem label="Events" value={`${stats.eventCount}+`} icon={Trophy} delay={0.4} />
            <StatsItem label="Participants" value={`${stats.participantCount}+`} icon={Zap} delay={0.5} />
            <StatsItem label="Prizes Worth" value={`₹${stats.prizePool}`} icon={Award} delay={0.6} />
        </div>

      </div>
    </section>
  );
};

const StatsItem = ({ label, value, icon: Icon, delay }: { label: string, value: string, icon: any, delay: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="text-center"
  >
    <div className="flex items-center justify-center gap-2 mb-2 text-red-500/80">
      <Icon className="w-5 h-5" />
      <span className="text-xs uppercase tracking-widest font-bold">{label}</span>
    </div>
    <div className="text-3xl md:text-5xl font-black text-white" style={{ fontFamily: 'Cinzel, serif' }}>
      {value}
    </div>
  </motion.div>
);
