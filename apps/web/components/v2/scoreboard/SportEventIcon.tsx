'use client';

import {
  AlertCircle,
  ArrowDown,
  ArrowDownCircle,
  ArrowLeftRight,
  Award,
  Circle,
  CircleDot,
  CircleOff,
  Clock,
  Flag,
  Flame,
  Hand,
  Move,
  MoveRight,
  Plus,
  PlusCircle,
  PlusSquare,
  Shield,
  ShieldAlert,
  Square,
  Star,
  Swords,
  Target,
  TimerOff,
  Triangle,
  Trophy,
  XCircle,
  XSquare,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'arrow-down': ArrowDown,
  'arrow-down-circle': ArrowDownCircle,
  'arrow-left-right': ArrowLeftRight,
  award: Award,
  circle: Circle,
  'circle-alert': AlertCircle,
  'circle-dot': CircleDot,
  'circle-off': CircleOff,
  clock: Clock,
  flag: Flag,
  flame: Flame,
  hand: Hand,
  move: Move,
  'move-right': MoveRight,
  plus: Plus,
  'plus-circle': PlusCircle,
  'plus-square': PlusSquare,
  shield: Shield,
  'shield-alert': ShieldAlert,
  square: Square,
  'square-x': XSquare,
  star: Star,
  swords: Swords,
  target: Target,
  'timer-off': TimerOff,
  triangle: Triangle,
  trophy: Trophy,
  zap: Zap,
  'x-circle': XCircle,
};

export function SportEventIcon({
  name,
  className,
  'data-testid': testId,
}: {
  name: string;
  className?: string;
  'data-testid'?: string;
}) {
  const Icon = ICONS[name] ?? CircleDot;
  return <Icon className={className} aria-hidden data-testid={testId} />;
}
