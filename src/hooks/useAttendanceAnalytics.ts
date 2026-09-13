import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AttendanceStats, AttendanceHeatmapData } from '@/types/school';
import { format, subDays, startOfYear, endOfYear, parseISO, getDay } from 'date-fns';

export function useAttendanceAnalytics(classId: string | undefined) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [last7DaysData, setLast7DaysData] = useState<Record<string, AttendanceHeatmapData[]>>({});
  const [dateRangeData, setDateRangeData] = useState<{ date: string; present: number; absent: number; late: number }[]>([]);
  const [yearlyData, setYearlyData] = useState<{ month: string; percentage: number }[]>([]);
  const [allTimeStats, setAllTimeStats] = useState<Record<string, AttendanceStats>>({});

  const fetchLast7Days = useCallback(async () => {
    if (!classId) return;

    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);

    const { data, error } = await supabase
      .from('attendance')
      .select('student_id, date, status, period')
      .eq('class_id', classId)
      .gte('date', format(sevenDaysAgo, 'yyyy-MM-dd'))
      .lte('date', format(today, 'yyyy-MM-dd'))
      .order('date');

    if (!error && data) {
      const grouped: Record<string, AttendanceHeatmapData[]> = {};
      data.forEach((record) => {
        if (!grouped[record.student_id]) {
          grouped[record.student_id] = [];
        }
        grouped[record.student_id].push({
          date: record.date,
          status: record.status as 'present' | 'absent' | 'late',
          period: record.period,
        });
      });
      setLast7DaysData(grouped);
    }
  }, [classId]);

  const fetchDateRange = useCallback(async (startDate: Date, endDate: Date) => {
    if (!classId) return;

    const { data, error } = await supabase
      .from('attendance')
      .select('date, status')
      .eq('class_id', classId)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'));

    if (!error && data) {
      const dailyStats: Record<string, { present: number; absent: number; late: number }> = {};
      
      data.forEach((record) => {
        if (!dailyStats[record.date]) {
          dailyStats[record.date] = { present: 0, absent: 0, late: 0 };
        }
        if (record.status === 'present') dailyStats[record.date].present++;
        else if (record.status === 'absent') dailyStats[record.date].absent++;
        else if (record.status === 'late') dailyStats[record.date].late++;
      });

      const chartData = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
      })).sort((a, b) => a.date.localeCompare(b.date));

      setDateRangeData(chartData);
    }
  }, [classId]);

  const fetchYearlyData = useCallback(async () => {
    if (!classId) return;

    const now = new Date();
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    const { data, error } = await supabase
      .from('attendance')
      .select('date, status')
      .eq('class_id', classId)
      .gte('date', format(yearStart, 'yyyy-MM-dd'))
      .lte('date', format(yearEnd, 'yyyy-MM-dd'));

    if (!error && data) {
      const monthlyStats: Record<string, { present: number; total: number }> = {};
      
      data.forEach((record) => {
        const month = format(parseISO(record.date), 'MMM');
        if (!monthlyStats[month]) {
          monthlyStats[month] = { present: 0, total: 0 };
        }
        monthlyStats[month].total++;
        if (record.status === 'present' || record.status === 'late') {
          monthlyStats[month].present++;
        }
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const chartData = months.map(month => ({
        month,
        percentage: monthlyStats[month]
          ? Math.round((monthlyStats[month].present / monthlyStats[month].total) * 100)
          : 0,
      }));

      setYearlyData(chartData);
    }
  }, [classId]);

  const fetchAllTimeStats = useCallback(async () => {
    if (!classId) return;

    // Get all students in class
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name')
      .eq('class_id', classId);

    if (!students) return;

    // Get all attendance records
    const { data: attendance } = await supabase
      .from('attendance')
      .select('student_id, date, status')
      .eq('class_id', classId)
      .order('date');

    if (!attendance) return;

    const stats: Record<string, AttendanceStats> = {};

    students.forEach((student) => {
      const studentRecords = attendance.filter(a => a.student_id === student.id);
      const total = studentRecords.length;
      const present = studentRecords.filter(a => a.status === 'present').length;
      const absent = studentRecords.filter(a => a.status === 'absent').length;
      const late = studentRecords.filter(a => a.status === 'late').length;

      // Calculate longest present streak
      let maxStreak = 0;
      let currentStreak = 0;
      studentRecords.forEach((record) => {
        if (record.status === 'present' || record.status === 'late') {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      // Calculate most absent day
      const dayAbsences: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const dayTotals: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      
      studentRecords.forEach((record) => {
        const dayOfWeek = getDay(parseISO(record.date));
        dayTotals[dayOfWeek]++;
        if (record.status === 'absent') {
          dayAbsences[dayOfWeek]++;
        }
      });

      let mostAbsentDay: string | null = null;
      let mostAbsentPercentage = 0;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      Object.entries(dayAbsences).forEach(([day, absences]) => {
        const total = dayTotals[parseInt(day)];
        if (total > 0) {
          const percentage = (absences / total) * 100;
          if (percentage > mostAbsentPercentage) {
            mostAbsentPercentage = percentage;
            mostAbsentDay = dayNames[parseInt(day)];
          }
        }
      });

      stats[student.id] = {
        total_days: total,
        present_days: present,
        absent_days: absent,
        late_days: late,
        attendance_percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        longest_present_streak: maxStreak,
        most_absent_day: mostAbsentDay,
        most_absent_day_percentage: Math.round(mostAbsentPercentage),
      };
    });

    setAllTimeStats(stats);
  }, [classId]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchLast7Days(),
        fetchYearlyData(),
        fetchAllTimeStats(),
      ]);
      setLoading(false);
    };
    
    fetchAll();
  }, [fetchLast7Days, fetchYearlyData, fetchAllTimeStats]);

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    loading,
    last7DaysData,
    dateRangeData,
    yearlyData,
    allTimeStats,
    fetchDateRange,
    exportToCSV,
    refetch: () => {
      fetchLast7Days();
      fetchYearlyData();
      fetchAllTimeStats();
    },
  };
}
