import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

interface StudentAttendanceStats extends AttendanceStats {
  student_id: string;
  student_name: string;
}

export function useClassAttendanceStats(classId: string | undefined) {
  const [todayStats, setTodayStats] = useState<AttendanceStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<AttendanceStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<AttendanceStats | null>(null);
  const [totalStats, setTotalStats] = useState<AttendanceStats | null>(null);
  const [studentStats, setStudentStats] = useState<StudentAttendanceStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      fetchAllStats();
    }
  }, [classId]);

  const calculateStats = (records: any[]): AttendanceStats => {
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, late, percentage };
  };

  const fetchAllStats = async () => {
    if (!classId) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Fetch students first
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('class_id', classId);

      // Today's attendance
      const { data: todayData } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('date', today);

      setTodayStats(calculateStats(todayData || []));

      // Weekly attendance
      const { data: weeklyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      setWeeklyStats(calculateStats(weeklyData || []));

      // Monthly attendance
      const { data: monthlyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .gte('date', monthStart)
        .lte('date', monthEnd);

      setMonthlyStats(calculateStats(monthlyData || []));

      // All-time attendance
      const { data: allData } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId);

      setTotalStats(calculateStats(allData || []));

      // Per-student stats (all-time)
      if (students && allData) {
        const studentStatsData: StudentAttendanceStats[] = students.map(student => {
          const studentRecords = allData.filter(r => r.student_id === student.id);
          const stats = calculateStats(studentRecords);
          return {
            ...stats,
            student_id: student.id,
            student_name: student.full_name,
          };
        });
        setStudentStats(studentStatsData);
      }

    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    todayStats,
    weeklyStats,
    monthlyStats,
    totalStats,
    studentStats,
    loading,
    refetch: fetchAllStats,
  };
}
