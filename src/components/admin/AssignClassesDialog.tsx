import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Class } from '@/types/database';
import { getErrorMessage } from '@/lib/errors';

interface AssignClassesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  teacherName: string;
  onAssigned?: () => void;
}

export function AssignClassesDialog({ open, onOpenChange, teacherId, teacherName, onAssigned }: AssignClassesDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !teacherId) return;
    void load();
  }, [open, teacherId]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: classesData }, { data: existingData }] = await Promise.all([
        supabase.from('classes').select('*').order('level').order('section'),
        supabase
          .from('class_teachers')
          .select('class_id, invitation_status')
          .eq('teacher_id', teacherId),
      ]);

      const existing = new Set(
        (existingData || [])
          .filter((r: any) => r.invitation_status === 'accepted')
          .map((r: any) => r.class_id as string)
      );
      setClasses((classesData as Class[]) || []);
      setAssignedIds(existing);
      setSelected(new Set(existing));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const toAdd = [...selected].filter((id) => !assignedIds.has(id));
      const toRemove = [...assignedIds].filter((id) => !selected.has(id));

      if (toAdd.length > 0) {
        const rows = toAdd.map((class_id) => ({
          class_id,
          teacher_id: teacherId,
          role: 'subject_lead' as const,
          invitation_status: 'accepted',
          invited_by: user.id,
        }));
        const { error } = await supabase.from('class_teachers').insert(rows);
        if (error) throw error;
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('class_teachers')
          .delete()
          .eq('teacher_id', teacherId)
          .in('class_id', toRemove);
        if (error) throw error;
      }

      toast({ title: 'Classes updated', description: `Saved assignments for ${teacherName}.` });
      onAssigned?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Failed to save', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Assign Classes
          </DialogTitle>
          <DialogDescription>
            Select any number of classes to assign to <span className="font-medium text-foreground">{teacherName}</span>. Multiple teachers can share a class.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : classes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No classes available. Create one first.</p>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                {selected.size} of {classes.length} selected
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selected.size === classes.length) setSelected(new Set());
                  else setSelected(new Set(classes.map((c) => c.id)));
                }}
              >
                {selected.size === classes.length ? 'Clear all' : 'Select all'}
              </Button>
            </div>
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-2">
                {classes.map((cls) => {
                  const isAssigned = assignedIds.has(cls.id);
                  const isSelected = selected.has(cls.id);
                  return (
                    <label
                      key={cls.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggle(cls.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {cls.class_name || `Class ${cls.level}`} - {cls.section}
                        </p>
                        <p className="text-xs text-muted-foreground">{cls.subject}</p>
                      </div>
                      {isAssigned && (
                        <Badge variant="secondary" className="text-xs">Currently assigned</Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
