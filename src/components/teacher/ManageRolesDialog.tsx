import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Crown, Shield, Star, Users, Loader2 } from 'lucide-react';
import type { StudentRole } from '@/types/learning';
import { toast } from '@/hooks/use-toast';

interface ManageRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentId: string;
  currentRoles: StudentRole[];
  onAssignRole: (studentId: string, role: StudentRole) => Promise<{ error: string | null }>;
  onRemoveRole: (studentId: string, role: StudentRole) => Promise<{ error: string | null }>;
}

const roleConfig: Record<StudentRole, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  topper: {
    label: 'Topper',
    icon: <Crown className="w-4 h-4" />,
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    description: 'Top performing student in the class'
  },
  monitor: {
    label: 'Monitor',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    description: 'Helps manage class activities'
  },
  proctor: {
    label: 'Proctor',
    icon: <Star className="w-4 h-4" />,
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
    description: 'Assists during exams and assessments'
  },
  class_representative: {
    label: 'Class Representative',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-green-500/10 text-green-600 border-green-500/30',
    description: 'Represents the class to teachers and administration'
  }
};

export function ManageRolesDialog({
  open,
  onOpenChange,
  studentName,
  studentId,
  currentRoles,
  onAssignRole,
  onRemoveRole
}: ManageRolesDialogProps) {
  const [loading, setLoading] = useState<StudentRole | null>(null);

  const handleToggleRole = async (role: StudentRole) => {
    setLoading(role);
    
    try {
      if (currentRoles.includes(role)) {
        const { error } = await onRemoveRole(studentId, role);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
        } else {
          toast({ title: 'Role removed', description: `${roleConfig[role].label} role removed from ${studentName}` });
        }
      } else {
        const { error } = await onAssignRole(studentId, role);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
        } else {
          toast({ title: 'Role assigned', description: `${studentName} is now a ${roleConfig[role].label}` });
        }
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Assign or remove roles for {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {(Object.entries(roleConfig) as [StudentRole, typeof roleConfig[StudentRole]][]).map(([role, config]) => (
            <div
              key={role}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                currentRoles.includes(role)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleToggleRole(role)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={role}
                  checked={currentRoles.includes(role)}
                  disabled={loading !== null}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={role} className="text-base font-medium cursor-pointer">
                      {config.label}
                    </Label>
                    <Badge variant="outline" className={config.color}>
                      {config.icon}
                    </Badge>
                    {loading === role && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {config.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
