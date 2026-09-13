import { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, Download, Filter } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAttendanceAnalytics } from '@/hooks/useAttendanceAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Class } from '@/types/database';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [filterAbsencesOnly, setFilterAbsencesOnly] = useState(false);
  
  const { 
    loading, 
    last7DaysData, 
    dateRangeData, 
    yearlyData, 
    allTimeStats,
    fetchDateRange,
    exportToCSV,
  } = useAttendanceAnalytics(selectedClassId);

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchDateRange(dateRange.from, dateRange.to);
    }
  }, [dateRange, fetchDateRange]);

  const fetchClasses = async () => {
    if (!user) return;
    const [ownedRes, assignedRes] = await Promise.all([
      supabase.from('classes').select('*').eq('teacher_id', user.id),
      supabase
        .from('class_teachers')
        .select('classes:class_id(*)')
        .eq('teacher_id', user.id)
        .eq('invitation_status', 'accepted'),
    ]);
    const owned = (ownedRes.data || []) as Class[];
    const assigned = ((assignedRes.data || []) as any[])
      .map((r) => r.classes)
      .filter(Boolean) as Class[];
    const map = new Map<string, Class>();
    [...owned, ...assigned].forEach((c) => map.set(c.id, c));
    const data = Array.from(map.values());
    setClasses(data);
    if (data && data.length > 0) {
      setSelectedClassId(data[0].id);
    }
  };

  // Get last 7 days for heatmap header
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      day: format(date, 'EEE'),
      dayNum: format(date, 'd'),
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'late': return 'bg-yellow-500';
      case 'absent': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  if (loading && !selectedClassId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Attendance Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive attendance tracking and insights
            </p>
          </div>
          
          {/* Class Selector */}
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.class_name} - {cls.subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="7days" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
            <TabsTrigger value="daterange">Date Range</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
            <TabsTrigger value="alltime">All Time</TabsTrigger>
          </TabsList>

          {/* TAB 1: Last 7 Days Heatmap */}
          <TabsContent value="7days" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>7-Day Attendance Heatmap</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setFilterAbsencesOnly(!filterAbsencesOnly)}>
                  <Filter className="h-4 w-4 mr-2" />
                  {filterAbsencesOnly ? 'Show All' : 'Absences Only'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-3 min-w-[150px]">Student</th>
                        {last7Days.map((day) => (
                          <th key={day.date} className="text-center py-2 px-2 min-w-[60px]">
                            <div className="text-xs text-muted-foreground">{day.day}</div>
                            <div className="font-medium">{day.dayNum}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(last7DaysData).map(([studentId, records]) => {
                        const hasAbsence = records.some(r => r.status === 'absent');
                        if (filterAbsencesOnly && !hasAbsence) return null;
                        
                        return (
                          <tr key={studentId} className="border-t">
                            <td className="py-2 px-3 font-medium">Student {studentId.slice(0, 8)}</td>
                            {last7Days.map((day) => {
                              const record = records.find(r => r.date === day.date);
                              return (
                                <td key={day.date} className="text-center py-2 px-2">
                                  <div 
                                    className={cn(
                                      "w-8 h-8 rounded-md mx-auto flex items-center justify-center text-white text-xs",
                                      record ? getStatusColor(record.status) : 'bg-gray-200'
                                    )}
                                    title={record?.status || 'No record'}
                                  >
                                    {record?.status === 'present' && 'P'}
                                    {record?.status === 'late' && 'L'}
                                    {record?.status === 'absent' && 'A'}
                                    {!record && '—'}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {Object.keys(last7DaysData).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No attendance data for the last 7 days</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Date Range */}
          <TabsContent value="daterange" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Custom Date Range Analysis</CardTitle>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => {
                          if (range?.from && range?.to) {
                            setDateRange({ from: range.from, to: range.to });
                          }
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(dateRangeData, 'attendance-report')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dateRangeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="#22c55e" name="Present" />
                      <Bar dataKey="late" fill="#eab308" name="Late" />
                      <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Yearly Summary */}
          <TabsContent value="yearly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Attendance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                      <Line 
                        type="monotone" 
                        dataKey="percentage" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Term Comparison */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Term 1 Average (Jan-Jun)</p>
                      <p className="text-2xl font-bold">
                        {yearlyData.slice(0, 6).reduce((sum, m) => sum + m.percentage, 0) / 6 || 0}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Term 2 Average (Jul-Dec)</p>
                      <p className="text-2xl font-bold">
                        {yearlyData.slice(6).reduce((sum, m) => sum + m.percentage, 0) / 6 || 0}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: All-Time Statistics */}
          <TabsContent value="alltime" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(allTimeStats).slice(0, 6).map(([studentId, stats]) => (
                <Card key={studentId}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Student {studentId.slice(0, 8)}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Attendance</span>
                      <Badge className={stats.attendance_percentage >= 80 ? 'bg-green-500' : stats.attendance_percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}>
                        {stats.attendance_percentage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Days</span>
                      <span>{stats.total_days}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Present</span>
                      <span className="text-green-600">{stats.present_days}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Absent</span>
                      <span className="text-red-600">{stats.absent_days}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Longest Streak</span>
                      <span className="font-medium">{stats.longest_present_streak} days</span>
                    </div>
                    {stats.most_absent_day && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Most Absent Day</span>
                        <span>{stats.most_absent_day} ({stats.most_absent_day_percentage}%)</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {Object.keys(allTimeStats).length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No attendance statistics available
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
