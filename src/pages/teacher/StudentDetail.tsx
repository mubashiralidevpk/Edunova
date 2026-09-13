import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Key, 
  Hash, 
  IdCard, 
  Calendar, 
  Clock, 
  BookOpen,
  Bell,
  MessageSquare,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  GraduationCap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Student, Class, Attendance, StudentActivity, StudentSession } from '@/types/database';
import { getErrorMessage } from '@/lib/errors';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground break-words">{value}</p>
    </div>
  );
}

interface StudentWithDetails extends Student {
  class?: Class;
  // Extended fields stored on students table (admission info)
  login_email?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  b_form_number?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  parent_email?: string | null;
  parent_mobile?: string | null;
  parent_father_name?: string | null;
  parent_father_nic?: string | null;
  parent_mother_name?: string | null;
  parent_mother_nic?: string | null;
  parent_mother_mobile?: string | null;
  admission_applicant_id?: string | null;
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [student, setStudent] = useState<StudentWithDetails | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
 
   useEffect(() => {
     if (id && user) {
       fetchStudentData();
     }
   }, [id, user]);
 
  const fetchStudentData = async () => {
    if (!id || !user) return;

    try {
      // Fetch student with class info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*, classes(*)')
        .eq('id', id)
        .single();

      if (studentError) throw studentError;

      const studentWithClass: StudentWithDetails = {
        ...studentData,
        class: studentData.classes as Class | undefined,
      };
      setStudent(studentWithClass);

      // Fetch teacher's classes for assignment
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      setClasses((classesData as Class[]) || []);

      // Fetch attendance records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', id)
        .order('date', { ascending: false })
        .limit(50);

      setAttendance((attendanceData as Attendance[]) || []);

      // Fetch activities
      const { data: activityData } = await supabase
        .from('student_activity')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      setActivities((activityData as StudentActivity[]) || []);

      // Fetch sessions
      const { data: sessionData } = await supabase
        .from('student_sessions')
        .select('*')
        .eq('student_id', id)
        .order('started_at', { ascending: false })
        .limit(20);

      setSessions((sessionData as StudentSession[]) || []);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClass = async (classId: string) => {
    if (!student) return;
    
    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ class_id: classId })
        .eq('id', student.id);

      if (error) throw error;

      toast({
        title: 'Class Assigned',
        description: 'Student has been assigned to the class successfully.',
      });

      // Refresh data
      fetchStudentData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getErrorMessage(error) || 'Failed to assign class.',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };
 
   const handleCopy = async (text: string, field: string) => {
     await navigator.clipboard.writeText(text);
     setCopiedField(field);
     setTimeout(() => setCopiedField(null), 2000);
   };
 
   const calculateTotalUsageTime = () => {
     const totalSeconds = sessions.reduce((acc, session) => {
       return acc + (session.duration_seconds || 0);
     }, 0);
     
     const hours = Math.floor(totalSeconds / 3600);
     const minutes = Math.floor((totalSeconds % 3600) / 60);
     
     if (hours > 0) {
       return `${hours}h ${minutes}m`;
     }
     return `${minutes}m`;
   };
 
   const getAttendanceStats = () => {
     const total = attendance.length;
     const present = attendance.filter(a => a.status === 'present').length;
     const absent = attendance.filter(a => a.status === 'absent').length;
     const late = attendance.filter(a => a.status === 'late').length;
     const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
 
     return { total, present, absent, late, percentage };
   };
 
   const getActivityIcon = (type: string) => {
     switch (type) {
       case 'note_viewed':
         return <BookOpen className="h-4 w-4" />;
       case 'announcement_read':
         return <Bell className="h-4 w-4" />;
       case 'message_sent':
         return <MessageSquare className="h-4 w-4" />;
       case 'login':
         return <User className="h-4 w-4" />;
       default:
         return <Clock className="h-4 w-4" />;
     }
   };
 
   const getActivityLabel = (type: string) => {
     switch (type) {
       case 'note_viewed':
         return 'Viewed a note';
       case 'announcement_read':
         return 'Read an announcement';
       case 'message_sent':
         return 'Sent a message';
       case 'login':
         return 'Logged in';
       default:
         return type;
     }
   };
 
  // Use the stored login email (created by the edge function). Falls back gracefully.
  const getStudentEmail = () => {
    if (!student) return 'N/A';
    return student.login_email || 'Email not available — recreate this student account';
  };
   if (loading) {
     return (
       <DashboardLayout>
         <div className="space-y-6">
           <Skeleton className="h-10 w-48" />
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Skeleton className="h-32" />
             <Skeleton className="h-32" />
             <Skeleton className="h-32" />
           </div>
           <Skeleton className="h-96" />
         </div>
       </DashboardLayout>
     );
   }
 
   if (!student) {
     return (
       <DashboardLayout>
         <div className="text-center py-12">
           <p className="text-muted-foreground">Student not found</p>
           <Button onClick={() => navigate(-1)} className="mt-4">
             Go Back
           </Button>
         </div>
       </DashboardLayout>
     );
   }
 
   const stats = getAttendanceStats();
 
   return (
     <DashboardLayout>
       <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{student.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {student.class ? (
                <Badge variant="secondary">
                  {student.class.class_name || `Class ${student.class.level}`} - {student.class.section}
                </Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-muted-foreground">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    No class assigned
                  </Badge>
                  {classes.length > 0 && (
                    <Select onValueChange={handleAssignClass} disabled={isAssigning}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Assign to class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.class_name || `Class ${cls.level}`} - {cls.section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
 
         {/* Quick Stats */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-primary/10">
                     <CheckCircle className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                     <p className="text-2xl font-bold">{stats.percentage}%</p>
                     <p className="text-sm text-muted-foreground">Attendance</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </motion.div>
 
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-blue-500/10">
                     <Clock className="h-5 w-5 text-blue-500" />
                   </div>
                   <div>
                     <p className="text-2xl font-bold">{calculateTotalUsageTime()}</p>
                     <p className="text-sm text-muted-foreground">Total Usage</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </motion.div>
 
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-purple-500/10">
                     <BookOpen className="h-5 w-5 text-purple-500" />
                   </div>
                   <div>
                     <p className="text-2xl font-bold">{activities.filter(a => a.activity_type === 'note_viewed').length}</p>
                     <p className="text-sm text-muted-foreground">Notes Viewed</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </motion.div>
 
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
             <Card>
               <CardContent className="pt-6">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-orange-500/10">
                     <MessageSquare className="h-5 w-5 text-orange-500" />
                   </div>
                   <div>
                     <p className="text-2xl font-bold">{activities.filter(a => a.activity_type === 'message_sent').length}</p>
                     <p className="text-sm text-muted-foreground">Messages Sent</p>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </motion.div>
         </div>
 
         {/* Main Content */}
         <Tabs defaultValue="info" className="space-y-4">
           <TabsList>
             <TabsTrigger value="info">Information</TabsTrigger>
             <TabsTrigger value="attendance">Attendance</TabsTrigger>
             <TabsTrigger value="activity">Activity</TabsTrigger>
             <TabsTrigger value="sessions">Sessions</TabsTrigger>
           </TabsList>
 
           <TabsContent value="info">
             <Card>
               <CardHeader>
                 <CardTitle>Student Information</CardTitle>
                 <CardDescription>Login credentials and personal details</CardDescription>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Personal Info */}
                   <div className="space-y-4">
                     <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                       <User className="h-5 w-5 text-muted-foreground" />
                       <div className="flex-1">
                         <p className="text-xs text-muted-foreground">Full Name</p>
                         <p className="font-medium">{student.full_name}</p>
                       </div>
                     </div>
 
                     <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                       <Hash className="h-5 w-5 text-muted-foreground" />
                       <div className="flex-1">
                         <p className="text-xs text-muted-foreground">Roll Number</p>
                         <p className="font-medium">{student.roll_number}</p>
                       </div>
                     </div>
 
                     <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                       <IdCard className="h-5 w-5 text-muted-foreground" />
                       <div className="flex-1">
                         <p className="text-xs text-muted-foreground">Student ID</p>
                         <p className="font-medium">{student.student_id}</p>
                       </div>
                     </div>
 
                     <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                       <Calendar className="h-5 w-5 text-muted-foreground" />
                       <div className="flex-1">
                         <p className="text-xs text-muted-foreground">Enrolled On</p>
                         <p className="font-medium">{format(new Date(student.created_at), 'PPP')}</p>
                       </div>
                     </div>
                   </div>
 
                   {/* Login Credentials */}
                   <div className="space-y-4">
                     <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                       <Mail className="h-5 w-5 text-primary" />
                       <div className="flex-1 min-w-0">
                         <p className="text-xs text-muted-foreground">Login Email</p>
                         <p className="font-medium font-mono text-sm truncate">{getStudentEmail()}</p>
                       </div>
                       <Button 
                         variant="ghost" 
                         size="icon"
                         onClick={() => handleCopy(getStudentEmail(), 'email')}
                       >
                         {copiedField === 'email' ? (
                           <Check className="h-4 w-4 text-primary" />
                         ) : (
                           <Copy className="h-4 w-4" />
                         )}
                       </Button>
                     </div>
 
                     <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                       <Key className="h-5 w-5 text-primary" />
                       <div className="flex-1">
                         <p className="text-xs text-muted-foreground">Password</p>
                         <p className="font-medium font-mono">{student.password_text || 'aksmsb'}</p>
                       </div>
                       <Button 
                         variant="ghost" 
                         size="icon"
                         onClick={() => handleCopy(student.password_text || 'aksmsb', 'password')}
                       >
                         {copiedField === 'password' ? (
                           <Check className="h-4 w-4 text-primary" />
                         ) : (
                           <Copy className="h-4 w-4" />
                         )}
                       </Button>
                     </div>
 
                     <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                       <p className="text-sm text-yellow-700 dark:text-yellow-400">
                         ⚠️ Share these credentials securely with the student. They should change their password after first login.
                       </p>
                     </div>
                   </div>
                 </div>

                  {/* Admission / extended info — only render if any field has a value */}
                  {(student.date_of_birth || student.gender || student.b_form_number || student.address ||
                    student.emergency_contact || student.parent_father_name || student.parent_father_nic ||
                    student.parent_mother_name || student.parent_mother_nic || student.parent_mother_mobile ||
                    student.parent_email || student.parent_mobile) && (
                    <div className="pt-6 border-t border-border space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
                          Personal Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {student.date_of_birth && (
                            <InfoRow label="Date of Birth" value={format(new Date(student.date_of_birth), 'PPP')} />
                          )}
                          {student.gender && <InfoRow label="Gender" value={student.gender} />}
                          {student.b_form_number && <InfoRow label="B-Form / CNIC" value={student.b_form_number} />}
                          {student.emergency_contact && <InfoRow label="Emergency Contact" value={student.emergency_contact} />}
                          {student.address && (
                            <div className="md:col-span-2">
                              <InfoRow label="Address" value={student.address} />
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Personal Details (extended)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(student as any).place_of_birth && <InfoRow label="Place of Birth" value={(student as any).place_of_birth} />}
                          {(student as any).nationality && <InfoRow label="Nationality" value={(student as any).nationality} />}
                          {(student as any).religion && <InfoRow label="Religion" value={(student as any).religion} />}
                          {(student as any).blood_group && <InfoRow label="Blood Group" value={(student as any).blood_group} />}
                          {(student as any).previous_school && <InfoRow label="Previous School" value={(student as any).previous_school} />}
                          {(student as any).elective_group && <InfoRow label="Elective Group" value={(student as any).elective_group} />}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Parents / Guardians</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {student.parent_father_name && <InfoRow label="Father's Name" value={student.parent_father_name} />}
                          {student.parent_father_nic && <InfoRow label="Father's NIC" value={student.parent_father_nic} />}
                          {student.parent_mobile && <InfoRow label="Father's Mobile" value={student.parent_mobile} />}
                          {(student as any).father_occupation && <InfoRow label="Father's Occupation" value={(student as any).father_occupation} />}
                          {(student as any).father_monthly_income && <InfoRow label="Monthly Income" value={`Rs. ${(student as any).father_monthly_income}`} />}
                          {student.parent_email && <InfoRow label="Parent Email" value={student.parent_email} />}
                          {student.parent_mother_name && <InfoRow label="Mother's Name" value={student.parent_mother_name} />}
                          {student.parent_mother_nic && <InfoRow label="Mother's NIC" value={student.parent_mother_nic} />}
                          {student.parent_mother_mobile && <InfoRow label="Mother's Mobile" value={student.parent_mother_mobile} />}
                          {(student as any).guardian_name && <InfoRow label="Guardian Name" value={(student as any).guardian_name} />}
                          {(student as any).guardian_relationship && <InfoRow label="Guardian Relationship" value={(student as any).guardian_relationship} />}
                          {(student as any).guardian_nic && <InfoRow label="Guardian NIC" value={(student as any).guardian_nic} />}
                          {(student as any).guardian_mobile && <InfoRow label="Guardian Mobile" value={(student as any).guardian_mobile} />}
                        </div>
                      </div>

                      {((student as any).photo_document_url || (student as any).bform_document_url || (student as any).transfer_certificate_url) && (
                        <div>
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Documents</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(student as any).photo_document_url && <a href={(student as any).photo_document_url} target="_blank" rel="noreferrer" className="p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 block"><p className="text-xs text-muted-foreground">Photo</p><p className="text-sm text-primary">View →</p></a>}
                            {(student as any).bform_document_url && <a href={(student as any).bform_document_url} target="_blank" rel="noreferrer" className="p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 block"><p className="text-xs text-muted-foreground">B-Form</p><p className="text-sm text-primary">View →</p></a>}
                            {(student as any).transfer_certificate_url && <a href={(student as any).transfer_certificate_url} target="_blank" rel="noreferrer" className="p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 block"><p className="text-xs text-muted-foreground">Transfer Certificate</p><p className="text-sm text-primary">View →</p></a>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
               </CardContent>
             </Card>
           </TabsContent>
 
           <TabsContent value="attendance">
             <Card>
               <CardHeader>
                 <CardTitle>Attendance History</CardTitle>
                 <CardDescription>
                   {stats.total} records • {stats.present} present • {stats.absent} absent • {stats.late} late
                 </CardDescription>
               </CardHeader>
               <CardContent>
                 {attendance.length === 0 ? (
                   <p className="text-center text-muted-foreground py-8">No attendance records yet</p>
                 ) : (
                   <div className="space-y-2">
                     {attendance.map((record) => (
                       <div 
                         key={record.id} 
                         className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                       >
                         <div className="flex items-center gap-3">
                           {record.status === 'present' ? (
                             <CheckCircle className="h-5 w-5 text-green-500" />
                           ) : record.status === 'late' ? (
                             <Clock className="h-5 w-5 text-yellow-500" />
                           ) : (
                             <XCircle className="h-5 w-5 text-red-500" />
                           )}
                           <span className="font-medium">{format(new Date(record.date), 'PPP')}</span>
                         </div>
                         <Badge variant={
                           record.status === 'present' ? 'default' : 
                           record.status === 'late' ? 'secondary' : 'destructive'
                         }>
                           {record.status}
                         </Badge>
                       </div>
                     ))}
                   </div>
                 )}
               </CardContent>
             </Card>
           </TabsContent>
 
           <TabsContent value="activity">
             <Card>
               <CardHeader>
                 <CardTitle>Recent Activity</CardTitle>
                 <CardDescription>Student engagement and actions</CardDescription>
               </CardHeader>
               <CardContent>
                 {activities.length === 0 ? (
                   <p className="text-center text-muted-foreground py-8">No activity recorded yet</p>
                 ) : (
                   <div className="space-y-2">
                     {activities.map((activity) => (
                       <div 
                         key={activity.id} 
                         className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                       >
                         <div className="flex items-center gap-3">
                           <div className="p-2 rounded-lg bg-background">
                             {getActivityIcon(activity.activity_type)}
                           </div>
                           <span>{getActivityLabel(activity.activity_type)}</span>
                         </div>
                         <span className="text-sm text-muted-foreground">
                           {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                         </span>
                       </div>
                     ))}
                   </div>
                 )}
               </CardContent>
             </Card>
           </TabsContent>
 
           <TabsContent value="sessions">
             <Card>
               <CardHeader>
                 <CardTitle>Usage Sessions</CardTitle>
                 <CardDescription>Total time spent: {calculateTotalUsageTime()}</CardDescription>
               </CardHeader>
               <CardContent>
                 {sessions.length === 0 ? (
                   <p className="text-center text-muted-foreground py-8">No sessions recorded yet</p>
                 ) : (
                   <div className="space-y-2">
                     {sessions.map((session) => (
                       <div 
                         key={session.id} 
                         className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                       >
                         <div className="flex items-center gap-3">
                           <Clock className="h-5 w-5 text-muted-foreground" />
                           <div>
                             <p className="font-medium">{format(new Date(session.started_at), 'PPP')}</p>
                             <p className="text-sm text-muted-foreground">
                               {format(new Date(session.started_at), 'p')}
                               {session.ended_at && ` - ${format(new Date(session.ended_at), 'p')}`}
                             </p>
                           </div>
                         </div>
                         <Badge variant="secondary">
                           {session.duration_seconds 
                             ? `${Math.round(session.duration_seconds / 60)} min` 
                             : 'Active'}
                         </Badge>
                       </div>
                     ))}
                   </div>
                 )}
               </CardContent>
             </Card>
           </TabsContent>
         </Tabs>
       </div>
     </DashboardLayout>
   );
 }