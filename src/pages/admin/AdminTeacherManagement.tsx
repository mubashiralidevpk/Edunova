import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, GraduationCap, Search, Calendar, BookOpen, Eye, Loader2, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Profile, UserRole, Class } from '@/types/database';
import { AssignClassesDialog } from '@/components/admin/AssignClassesDialog';
import { invokeFn, getErrorMessage } from '@/lib/errors';
import { ALL_STAFF_ROLES, fetchStaffRoles } from '@/hooks/useStaffRoles';

interface ScheduleEntry {
  day_of_week: number;
  period: number;
  start_time: string;
  end_time: string;
  class_id: string;
  subject: string;
  room_number?: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminTeacherManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<(Profile & { role?: string })[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [timetableDialogOpen, setTimetableDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Profile | null>(null);
  const [teacherSchedules, setTeacherSchedules] = useState<any[]>([]);
  const [savingRoleFor, setSavingRoleFor] = useState<string | null>(null);
  const [rolesMap, setRolesMap] = useState<Record<string, string[]>>({});
  const [rolesDialogFor, setRolesDialogFor] = useState<Profile | null>(null);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create teacher form
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    class_incharge: '',
    subjects: '',
    staff_role: 'Staff',
  });

  const STAFF_ROLES = [...ALL_STAFF_ROLES] as string[];

  // Schedule entry form
  const [scheduleEntry, setScheduleEntry] = useState<ScheduleEntry>({
    day_of_week: 1,
    period: 1,
    start_time: '08:00',
    end_time: '08:45',
    class_id: '',
    subject: '',
    room_number: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, rolesRes, classesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('user_roles').select('*'),
        supabase.from('classes').select('*').order('class_name'),
      ]);

      const roles = (rolesRes.data || []) as UserRole[];
      const teacherUserIds = roles.filter(r => r.role === 'teacher').map(r => r.user_id);
      const teacherProfiles = ((profilesRes.data || []) as Profile[]).filter(p => teacherUserIds.includes(p.user_id));

      setTeachers(teacherProfiles);
      setClasses((classesRes.data || []) as Class[]);
      setRolesMap(await fetchStaffRoles(teacherProfiles.map((t) => t.user_id)));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const [creating, setCreating] = useState(false);

  const handleCreateTeacher = async () => {
    if (!formData.full_name || !formData.email) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (formData.password !== formData.confirm_password) {
      toast({ title: "Passwords do not match", description: "Re-type the same password in both fields.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await invokeFn('create-teacher-account', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.full_name,
          staffRole: formData.staff_role,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Teacher account created", description: `Login: ${formData.email}` });
      setCreateDialogOpen(false);
      setFormData({ full_name: '', email: '', password: '', confirm_password: '', class_incharge: '', subjects: '', staff_role: 'Staff' });
      fetchData();
    } catch (error: any) {
      toast({ title: "Failed to create teacher", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const openTimetable = async (teacher: Profile) => {
    setSelectedTeacher(teacher);

    const { data } = await supabase
      .from('teacher_schedules')
      .select('*, classes:class_id(class_name, subject)')
      .eq('teacher_id', teacher.user_id)
      .order('day_of_week')
      .order('period');

    setTeacherSchedules(data || []);
    setTimetableDialogOpen(true);
  };

  const addScheduleEntry = async () => {
    if (!selectedTeacher || !scheduleEntry.class_id) {
      toast({ title: "Select a class", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from('teacher_schedules').insert({
        teacher_id: selectedTeacher.user_id,
        class_id: scheduleEntry.class_id,
        day_of_week: scheduleEntry.day_of_week,
        period: scheduleEntry.period,
        start_time: scheduleEntry.start_time,
        end_time: scheduleEntry.end_time,
        subject: scheduleEntry.subject || null,
        room_number: scheduleEntry.room_number || null,
      });

      if (error) throw error;

      toast({ title: "Period added" });
      openTimetable(selectedTeacher);
      setScheduleEntry(prev => ({ ...prev, period: prev.period + 1 }));
    } catch (error: any) {
      toast({ title: "Failed to add", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const deleteScheduleEntry = async (id: string) => {
    await supabase.from('teacher_schedules').delete().eq('id', id);
    if (selectedTeacher) openTimetable(selectedTeacher);
  };

  const openRolesDialog = (teacher: Profile) => {
    setRolesDialogFor(teacher);
    const current = rolesMap[teacher.user_id] || (teacher.staff_role ? [teacher.staff_role] : ['Staff']);
    setDraftRoles(current);
  };

  const saveRoles = async () => {
    if (!rolesDialogFor) return;
    const teacherUserId = rolesDialogFor.user_id;
    setSavingRoleFor(teacherUserId);
    try {
      const roles = draftRoles.length ? draftRoles : ['Staff'];
      const { error } = await supabase.rpc('set_staff_roles', {
        _teacher_user_id: teacherUserId,
        _roles: roles,
      });
      if (error) throw error;

      setRolesMap((prev) => ({ ...prev, [teacherUserId]: roles }));
      setTeachers((prev) => prev.map((t) => (t.user_id === teacherUserId ? { ...t, staff_role: roles[0] } : t)));
      toast({ title: 'Roles updated', description: roles.join(', ') });
      setRolesDialogFor(null);
    } catch (error: any) {
      toast({ title: 'Failed to update roles', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSavingRoleFor(null);
    }
  };

  const handleDeleteTeacher = async (teacher: Profile) => {
    const ok = window.confirm(`Delete ${teacher.full_name}? Their login is removed and their classes are transferred to you. This cannot be undone.`);
    if (!ok) return;
    setDeletingId(teacher.user_id);
    try {
      const { data, error } = await invokeFn('delete-teacher-account', { body: { teacherUserId: teacher.user_id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTeachers((prev) => prev.filter((t) => t.user_id !== teacher.user_id));
      toast({ title: 'Teacher removed', description: `${teacher.full_name} no longer has access.` });
    } catch (error: any) {
      toast({ title: 'Failed to delete teacher', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTeachers = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
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
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Teacher Management</h1>
            <p className="text-muted-foreground">Create accounts, assign roles, and manage timetables</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Create Teacher
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-muted/50"
          />
        </div>

        {/* Teachers Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeachers.map((teacher, i) => (
            <motion.div
              key={teacher.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="glass-card hover:neon-border transition-all">
                <CardContent className="p-5">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/teachers/${teacher.user_id}`)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <span className="text-primary font-bold text-sm">
                            {teacher.full_name[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground hover:text-primary transition-colors">
                            {teacher.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{teacher.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary/30">
                        <GraduationCap className="h-3 w-3 mr-1" /> Teacher
                      </Badge>
                    </div>
                  </button>

                  <div className="mb-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">Staff roles</Label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(rolesMap[teacher.user_id] || (teacher.staff_role ? [teacher.staff_role] : ['Staff'])).map((r) => (
                        <Badge key={r} variant="secondary" className="max-w-full truncate">{r}</Badge>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => openRolesDialog(teacher)}
                        disabled={savingRoleFor === teacher.user_id}
                      >
                        {savingRoleFor === teacher.user_id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <ShieldCheck className="h-3 w-3" />}
                        Manage
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 sm:grid-cols-4">
                    <Button
                      size="sm"
                      variant="default"
                      className="min-w-0"
                      onClick={() => { setSelectedTeacher(teacher); setAssignDialogOpen(true); }}
                    >
                      <BookOpen className="h-3 w-3 mr-1 shrink-0" /> <span className="truncate">Assign</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-w-0"
                      onClick={() => openTimetable(teacher)}
                    >
                      <Calendar className="h-3 w-3 mr-1 shrink-0" /> <span className="truncate">Schedule</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-w-0"
                      onClick={() => navigate(`/admin/teachers/${teacher.user_id}`)}
                    >
                      <Eye className="h-3 w-3 mr-1 shrink-0" /> <span className="truncate">Logs</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-w-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteTeacher(teacher)}
                      disabled={deletingId === teacher.user_id}
                    >
                      {deletingId === teacher.user_id
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin shrink-0" />
                        : <Trash2 className="h-3 w-3 mr-1 shrink-0" />}
                      <span className="truncate">Delete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredTeachers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No teachers found</p>
          </div>
        )}
      </div>

      {/* Create Teacher Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="glass-card border-primary/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Create Teacher Account
            </DialogTitle>
          </DialogHeader>
          {creating && (
            <div className="h-1 w-full bg-muted overflow-hidden rounded-full relative">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-primary rounded-full" style={{ animation: 'tm-loading 1.2s ease-in-out infinite' }} />
              <style>{`@keyframes tm-loading {0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Teacher's full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="teacher@aksms.edu"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Re-type Password *</Label>
                <Input
                  type="password"
                  value={formData.confirm_password}
                  onChange={e => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Staff Role *</Label>
              <Select value={formData.staff_role} onValueChange={v => setFormData(prev => ({ ...prev, staff_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Admission Manager unlocks the Admissions workflow.</p>
            </div>
            <div className="space-y-2">
              <Label>Class In-charge (optional)</Label>
              <Select
                value={formData.class_incharge}
                onValueChange={v => setFormData(prev => ({ ...prev, class_incharge: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.class_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subjects (comma separated)</Label>
              <Input
                value={formData.subjects}
                onChange={e => setFormData(prev => ({ ...prev, subjects: e.target.value }))}
                placeholder="Mathematics, Physics"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateTeacher} disabled={creating} className="min-w-[140px]">
              {creating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                'Add Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timetable Dialog */}
      <Dialog open={timetableDialogOpen} onOpenChange={setTimetableDialogOpen}>
        <DialogContent className="glass-card border-primary/10 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Timetable: {selectedTeacher?.full_name}
            </DialogTitle>
          </DialogHeader>

          {/* Add entry form */}
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-primary">Add Period</p>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <div>
                  <Label className="text-xs">Day</Label>
                  <Select
                    value={scheduleEntry.day_of_week.toString()}
                    onValueChange={v => setScheduleEntry(prev => ({ ...prev, day_of_week: parseInt(v) }))}
                  >
                    <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d, i) => (
                        <SelectItem key={i} value={i.toString()}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Period</Label>
                  <Select
                    value={scheduleEntry.period.toString()}
                    onValueChange={v => setScheduleEntry(prev => ({ ...prev, period: parseInt(v) }))}
                  >
                    <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8].map(p => (
                        <SelectItem key={p} value={p.toString()}>P{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="time"
                    value={scheduleEntry.start_time}
                    onChange={e => setScheduleEntry(prev => ({ ...prev, start_time: e.target.value }))}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label className="text-xs">End</Label>
                  <Input
                    type="time"
                    value={scheduleEntry.end_time}
                    onChange={e => setScheduleEntry(prev => ({ ...prev, end_time: e.target.value }))}
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <Label className="text-xs">Class *</Label>
                  <Select
                    value={scheduleEntry.class_id}
                    onValueChange={v => setScheduleEntry(prev => ({ ...prev, class_id: v }))}
                  >
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input
                    value={scheduleEntry.subject}
                    onChange={e => setScheduleEntry(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Auto from class"
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <Button onClick={addScheduleEntry} size="sm" className="w-full">Add Period</Button>
            </CardContent>
          </Card>

          {/* Current schedule */}
          <div className="space-y-3">
            {DAYS.map((day, dayIdx) => {
              const dayEntries = teacherSchedules.filter((s: any) => s.day_of_week === dayIdx);
              if (dayEntries.length === 0) return null;
              return (
                <div key={day}>
                  <p className="text-sm font-medium text-primary mb-2">{day}</p>
                  <div className="space-y-1">
                    {dayEntries.map((entry: any) => (
                      <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">P{entry.period}</Badge>
                          <span className="font-mono text-xs">{entry.start_time}-{entry.end_time}</span>
                          <span>{entry.classes?.class_name}</span>
                          {entry.subject && <span className="text-muted-foreground">({entry.subject})</span>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteScheduleEntry(entry.id)} className="text-destructive h-6 px-2">×</Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {teacherSchedules.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No schedule entries yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Classes Dialog */}
      {selectedTeacher && (
        <AssignClassesDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          teacherId={selectedTeacher.user_id}
          teacherName={selectedTeacher.full_name}
          onAssigned={fetchData}
        />
      )}

      {/* Staff Roles Dialog */}
      <Dialog open={!!rolesDialogFor} onOpenChange={(open) => !open && setRolesDialogFor(null)}>
        <DialogContent className="glass-card border-primary/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Staff Roles
            </DialogTitle>
            <DialogDescription>
              {rolesDialogFor ? `Choose every role held by ${rolesDialogFor.full_name}.` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            {STAFF_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={draftRoles.includes(r)}
                  onCheckedChange={(checked) =>
                    setDraftRoles((prev) => (checked ? [...new Set([...prev, r])] : prev.filter((x) => x !== r)))
                  }
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRolesDialogFor(null)}>Cancel</Button>
            <Button onClick={saveRoles} disabled={!!savingRoleFor}>
              {savingRoleFor ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
