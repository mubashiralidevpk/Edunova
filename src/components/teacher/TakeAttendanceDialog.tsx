import { useState } from 'react';
import { Loader2, Check, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Student, Attendance } from '@/types/database';

interface TakeAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  students: Student[];
  existingAttendance: Attendance[];
  period?: number;
  onSuccess: () => void;
}

type AttendanceStatus = 'present' | 'absent' | 'late';

export function TakeAttendanceDialog({
  open,
  onOpenChange,
  classId,
  students,
  existingAttendance,
  period = 0,
  onSuccess,
}: TakeAttendanceDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize attendance state from existing records
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>(() => {
    const records: Record<string, AttendanceStatus> = {};
    existingAttendance.forEach((a) => {
      records[a.student_id] = a.status as AttendanceStatus;
    });
    return records;
  });

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Check if all students have been marked
    const unmarkedStudents = students.filter((s) => !attendanceRecords[s.id]);
    if (unmarkedStudents.length > 0) {
      toast({
        title: 'Incomplete Attendance',
        description: `Please mark attendance for all ${unmarkedStudents.length} remaining students.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const records = students.map((student) => ({
        class_id: classId,
        student_id: student.id,
        date: today,
        period,
        status: attendanceRecords[student.id],
        marked_by: user.id,
      }));

      // Upsert attendance records
      const { error } = await supabase
        .from('attendance')
        .upsert(records, {
          onConflict: 'class_id,student_id,date,period',
        });

      if (error) throw error;

      toast({
        title: 'Attendance Saved',
        description: 'Attendance has been recorded successfully.',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Failed to save attendance',
        description: error?.message || 'Please try again. If the problem persists, contact your admin.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAllPresent = () => {
    const records: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      records[s.id] = 'present';
    });
    setAttendanceRecords(records);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Take Attendance</DialogTitle>
          <DialogDescription>
            {period === 0 ? 'Full day' : `Period ${period}`} · {new Date().toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {students.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No students in this class yet.
            </p>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={markAllPresent}>
                  Mark All Present
                </Button>
              </div>
              <div className="divide-y">
                {students.map((student) => (
                  <div key={student.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">Roll: {student.roll_number}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={attendanceRecords[student.id] === 'present' ? 'default' : 'outline'}
                        className={attendanceRecords[student.id] === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                        onClick={() => handleStatusChange(student.id, 'present')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={attendanceRecords[student.id] === 'late' ? 'default' : 'outline'}
                        className={attendanceRecords[student.id] === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                        onClick={() => handleStatusChange(student.id, 'late')}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={attendanceRecords[student.id] === 'absent' ? 'default' : 'outline'}
                        className={attendanceRecords[student.id] === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                        onClick={() => handleStatusChange(student.id, 'absent')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || students.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Attendance'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
