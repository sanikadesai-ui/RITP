/**
 * Schedule Item Types Configuration
 * Centralized configuration for schedule item types used across the app
 */

import { Calendar, Clock, MapPin, Coffee, Trophy, Users, Sparkles, Mic, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ItemTypeConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
}

export const ITEM_TYPES: Record<string, ItemTypeConfig> = {
  ceremony: { 
    icon: Sparkles, 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/20', 
    label: 'Ceremony' 
  },
  event: { 
    icon: Calendar, 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20', 
    label: 'Event' 
  },
  competition: { 
    icon: Trophy, 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20', 
    label: 'Competition' 
  },
  workshop: { 
    icon: Users, 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20', 
    label: 'Workshop' 
  },
  break: { 
    icon: Coffee, 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-500/20', 
    label: 'Break' 
  },
  activity: { 
    icon: Star, 
    color: 'text-pink-400', 
    bgColor: 'bg-pink-500/20', 
    label: 'Activity' 
  },
  other: { 
    icon: Mic, 
    color: 'text-gray-400', 
    bgColor: 'bg-gray-500/20', 
    label: 'Other' 
  },
};

/**
 * Get type info with fallback to 'other' type
 */
export function getItemTypeInfo(type: string): ItemTypeConfig {
  return ITEM_TYPES[type] || ITEM_TYPES.other;
}

export default ITEM_TYPES;
