import { Badge } from '@/components/ui/badge';
import { Crown, Shield, Star, Users } from 'lucide-react';
import type { StudentRole } from '@/types/learning';

interface StudentRoleBadgesProps {
  roles: StudentRole[];
  size?: 'sm' | 'md';
}

const roleConfig: Record<StudentRole, { label: string; icon: React.ReactNode; color: string }> = {
  topper: {
    label: 'Topper',
    icon: <Crown className="w-3 h-3" />,
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
  },
  monitor: {
    label: 'Monitor',
    icon: <Shield className="w-3 h-3" />,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30'
  },
  proctor: {
    label: 'Proctor',
    icon: <Star className="w-3 h-3" />,
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/30'
  },
  class_representative: {
    label: 'CR',
    icon: <Users className="w-3 h-3" />,
    color: 'bg-green-500/10 text-green-600 border-green-500/30'
  }
};

export function StudentRoleBadges({ roles, size = 'sm' }: StudentRoleBadgesProps) {
  if (!roles || roles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map(role => {
        const config = roleConfig[role];
        if (!config) return null;
        
        return (
          <Badge
            key={role}
            variant="outline"
            className={`${config.color} ${size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-sm px-2 py-0.5'}`}
          >
            <span className="flex items-center gap-1">
              {config.icon}
              {size === 'md' && config.label}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}
