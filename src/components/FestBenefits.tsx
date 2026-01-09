import { Gift, Coffee, BookOpen, Utensils, Bus, Music, Ticket, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FestBenefitsProps {
  className?: string;
  compact?: boolean;
}

const benefits = [
  {
    icon: Gift,
    title: 'Goodies & Merchandise',
    description: 'Exclusive fest merchandise and surprise goodies',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    icon: Coffee,
    title: 'Refreshments',
    description: 'Complimentary refreshments throughout the event',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    icon: BookOpen,
    title: 'Book Fair Access',
    description: 'Access to exclusive book fair with special discounts',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    icon: Utensils,
    title: 'Food Stalls',
    description: 'Enjoy variety of delicious food stalls',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  {
    icon: Bus,
    title: 'Free Transportation',
    description: 'Shuttle service from Lohegaon bus stop to venue',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  {
    icon: Music,
    title: 'Mini Concert',
    description: 'Enjoy live performances and mini concert',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
  {
    icon: Ticket,
    title: '3 Free Events',
    description: 'Participate in 3 events completely free!',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
];

export function FestBenefits({ className, compact = false }: FestBenefitsProps) {
  if (compact) {
    return (
      <div className={cn('', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">What You Get</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg border',
                benefit.bgColor,
                benefit.borderColor,
                'transition-transform hover:scale-105'
              )}
            >
              <benefit.icon className={cn('w-4 h-4 flex-shrink-0', benefit.color)} />
              <span className="text-xs text-white/90 line-clamp-1">{benefit.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 mb-4">
          <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
          <span className="text-yellow-300 font-semibold">What's Included</span>
          <Star className="w-5 h-5 text-yellow-400 animate-pulse" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Fest Pass Benefits
        </h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          Your fest pass unlocks exclusive perks and experiences
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {benefits.map((benefit, index) => (
          <div
            key={index}
            className={cn(
              'group relative p-4 rounded-xl border backdrop-blur-sm',
              'bg-gradient-to-br from-black/60 to-black/40',
              benefit.borderColor,
              'hover:scale-[1.02] transition-all duration-300',
              'hover:shadow-lg hover:shadow-red-500/10'
            )}
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            {/* Icon */}
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
              benefit.bgColor,
              'group-hover:scale-110 transition-transform duration-300'
            )}>
              <benefit.icon className={cn('w-6 h-6', benefit.color)} />
            </div>
            
            {/* Content */}
            <h3 className="text-white font-semibold mb-1">{benefit.title}</h3>
            <p className="text-zinc-400 text-sm">{benefit.description}</p>

            {/* Decorative Corner */}
            <div className={cn(
              'absolute top-0 right-0 w-16 h-16 opacity-20',
              'bg-gradient-to-bl rounded-tr-xl',
              benefit.bgColor.replace('/10', '/30')
            )} />
          </div>
        ))}
      </div>

      {/* Bottom Highlight */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-950/40 via-red-900/30 to-red-950/40 border border-red-500/30">
          <Sparkles className="w-5 h-5 text-red-400" />
          <span className="text-red-100 font-medium">All this for just one registration!</span>
          <Sparkles className="w-5 h-5 text-red-400" />
        </div>
      </div>
    </div>
  );
}
