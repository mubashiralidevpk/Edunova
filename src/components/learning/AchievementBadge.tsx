import { 
  Star, 
  Zap, 
  Trophy, 
  Award, 
  Target, 
  Flame, 
  Crown,
  Lock
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Achievement } from '@/types/learning';

interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  'Star': <Star className="w-6 h-6" />,
  'Zap': <Zap className="w-6 h-6" />,
  'Trophy': <Trophy className="w-6 h-6" />,
  'Award': <Award className="w-6 h-6" />,
  'Target': <Target className="w-6 h-6" />,
  'Flame': <Flame className="w-6 h-6" />,
  'Crown': <Crown className="w-6 h-6" />,
};

export function AchievementBadge({ achievement, earned, earnedAt }: AchievementBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <div 
          className={`
            relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
            ${earned 
              ? 'bg-gradient-to-br from-yellow-400/30 to-orange-500/30 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/20' 
              : 'bg-muted/50 border-2 border-muted grayscale opacity-50'
            }
          `}
        >
          <div className={earned ? 'text-yellow-500' : 'text-muted-foreground'}>
            {earned ? (iconMap[achievement.icon || ''] || <Trophy className="w-6 h-6" />) : <Lock className="w-6 h-6" />}
          </div>
          
          {earned && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">✓</span>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-bold">{achievement.name}</p>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
          <p className="text-xs text-primary">+{achievement.xp_reward} XP reward</p>
          {earned && earnedAt && (
            <p className="text-xs text-green-500">
              Earned {new Date(earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
