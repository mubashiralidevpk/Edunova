import { Progress } from '@/components/ui/progress';
import { Flame, Star, Trophy, Zap } from 'lucide-react';
import type { StudentXP } from '@/types/learning';

interface XPProgressBarProps {
  studentXP: StudentXP | null;
}

export function XPProgressBar({ studentXP }: XPProgressBarProps) {
  if (!studentXP) {
    return (
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl p-6 border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Star className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Start Your Journey!</h3>
              <p className="text-sm text-muted-foreground">Begin a course to earn XP</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const xpProgress = studentXP.xp_to_next_level > 0 
    ? ((studentXP.total_xp % 100) / (studentXP.xp_to_next_level / studentXP.current_level)) * 100
    : 0;

  return (
    <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 rounded-2xl p-6 border border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-2xl font-bold text-primary-foreground">{studentXP.current_level}</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">Level {studentXP.current_level}</h3>
            <p className="text-sm text-muted-foreground">{studentXP.total_xp} XP Total</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-background/50 rounded-full px-4 py-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-bold">{studentXP.streak_days} day streak</span>
          </div>
          <div className="flex items-center gap-2 bg-background/50 rounded-full px-4 py-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="font-bold">{studentXP.total_xp} XP</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress to Level {studentXP.current_level + 1}</span>
          <span className="font-medium">{studentXP.xp_to_next_level - (studentXP.total_xp % 100)} XP to go</span>
        </div>
        <Progress value={xpProgress} className="h-3 bg-background/50" />
      </div>
    </div>
  );
}
