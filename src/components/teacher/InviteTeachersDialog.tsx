import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClassTeachers } from '@/hooks/useClassTeachers';
import { ClassTeacherRole, ROLE_PERMISSIONS } from '@/types/school';
import { UserPlus, Crown, Trash2, Check, X } from 'lucide-react';

interface InviteTeachersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
}

const ROLE_OPTIONS: { value: ClassTeacherRole; label: string; description: string }[] = [
  { value: 'subject_lead', label: 'Subject Lead', description: 'Full edit access' },
  { value: 'support_teacher', label: 'Support Teacher', description: 'Add content only' },
  { value: 'lab_assistant', label: 'Lab Assistant', description: 'Attendance only' },
  { value: 'observer', label: 'Observer', description: 'View only' },
];

const getRoleBadgeColor = (role: ClassTeacherRole) => {
  switch (role) {
    case 'class_admin': return 'bg-purple-100 text-purple-800';
    case 'subject_lead': return 'bg-blue-100 text-blue-800';
    case 'support_teacher': return 'bg-green-100 text-green-800';
    case 'lab_assistant': return 'bg-yellow-100 text-yellow-800';
    case 'observer': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function InviteTeachersDialog({ open, onOpenChange, classId }: InviteTeachersDialogProps) {
  const { teachers, isClassAdmin, inviteTeacher, updateTeacherRole, removeTeacher } = useClassTeachers(classId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ClassTeacherRole>('observer');
  const [roleDescription, setRoleDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    
    setLoading(true);
    const success = await inviteTeacher(email.trim(), role, roleDescription.trim());
    if (success) {
      setEmail('');
      setRole('observer');
      setRoleDescription('');
    }
    setLoading(false);
  };

  const pendingTeachers = teachers.filter(t => t.invitation_status === 'pending');
  const acceptedTeachers = teachers.filter(t => t.invitation_status === 'accepted');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Manage Class Teachers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Form */}
          {isClassAdmin && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold">Invite New Teacher</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Teacher Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="teacher@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as ClassTeacherRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDesc">Role Description (optional)</Label>
                <Input
                  id="roleDesc"
                  placeholder="e.g., English Teacher, Urdu Teacher"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>
              <Button onClick={handleInvite} disabled={loading || !email.trim()}>
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          )}

          {/* Permission Matrix */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-3">Permission Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Role</th>
                    <th className="text-center py-2">Edit Content</th>
                    <th className="text-center py-2">Manage Students</th>
                    <th className="text-center py-2">Take Attendance</th>
                    <th className="text-center py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
                    <tr key={role} className="border-b">
                      <td className="py-2 capitalize">{role.replace('_', ' ')}</td>
                      <td className="text-center">{perms.canEditContent ? '✓' : '—'}</td>
                      <td className="text-center">{perms.canManageStudents ? '✓' : '—'}</td>
                      <td className="text-center">{perms.canTakeAttendance ? '✓' : '—'}</td>
                      <td className="text-center">{perms.canGrade ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Teacher Lists */}
          <ScrollArea className="h-[200px]">
            <div className="space-y-4">
              {/* Pending Invitations */}
              {pendingTeachers.length > 0 && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Pending Invitations</h4>
                  <div className="space-y-2">
                    {pendingTeachers.map((teacher) => (
                      <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                        <div>
                          <p className="font-medium">{teacher.teacher_profile?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{teacher.role_description || teacher.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(teacher.role)}>{teacher.role}</Badge>
                          <Badge variant="outline" className="text-yellow-600">Pending</Badge>
                          {isClassAdmin && (
                            <Button size="icon" variant="ghost" onClick={() => removeTeacher(teacher.teacher_id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accepted Teachers */}
              {acceptedTeachers.length > 0 && (
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">Active Teachers</h4>
                  <div className="space-y-2">
                    {acceptedTeachers.map((teacher) => (
                      <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {teacher.is_class_admin && <Crown className="h-4 w-4 text-yellow-500" />}
                          <div>
                            <p className="font-medium">{teacher.teacher_profile?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{teacher.role_description || teacher.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(teacher.role)}>{teacher.role}</Badge>
                          {isClassAdmin && !teacher.is_class_admin && (
                            <Button size="icon" variant="ghost" onClick={() => removeTeacher(teacher.teacher_id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teachers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No other teachers assigned to this class yet
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
