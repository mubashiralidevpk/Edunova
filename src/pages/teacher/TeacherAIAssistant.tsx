import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PersistentChatPanel } from '@/components/ai/PersistentChatPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AIBulkAddStudents } from '@/components/teacher/AIBulkAddStudents';
import { OpsActionPanel } from '@/components/ai/OpsActionPanel';


export default function TeacherAIAssistant() {
  const { user } = useAuth();
  const [classContext, setClassContext] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const fetchContext = async () => {
      if (!user) return;
      const { data: classes } = await supabase.from('classes').select('id, class_name, subject').eq('teacher_id', user.id);
      if (classes && classes.length > 0) {
        const classIds = classes.map((c) => c.id);
        const { data: students } = await supabase.from('students').select('id').in('class_id', classIds);
        const { data: attendance } = await supabase.from('attendance').select('student_id, date, status').in('class_id', classIds).order('date', { ascending: false }).limit(100);
        setClassContext({
          classes: classes.map((c) => ({ name: c.class_name, subject: c.subject })),
          totalStudents: students?.length || 0,
          recentAttendance: attendance?.slice(0, 20),
        });
      }
    };
    fetchContext();
  }, [user]);

  return (
    <DashboardLayout>
      <Tabs defaultValue="chat" className="flex flex-col h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-5rem)] overflow-hidden">
        <TabsList className="w-fit mx-auto mb-3 glass-card border border-border flex-shrink-0">
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="actions">Do It For Me</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Add Students</TabsTrigger>
          <TabsTrigger value="insights">Auto Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="flex-1 m-0 overflow-hidden">
          <OpsActionPanel
            role="teacher"
            context={classContext}
            quickPrompts={[
              'Create class 9-B for Mathematics and add 20 students with login emails',
              'Give every student in 10-A a login email and password',
              'Post a pinned announcement to 10-A: Parent meeting Friday 2 PM',
              'Build my weekly timetable for 10-A, Monday to Friday, periods 1 to 8',
            ]}
          />
        </TabsContent>


        <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
          <PersistentChatPanel
            assistantType="teacher"
            title="EduCore"
            subtitle="Teaching Assistant"
            accent="primary"
            context={classContext}
            emptyHeading="Hello, Teacher!"
            emptyBody="I'm EduCore. I analyze student data, identify patterns, and provide actionable insights."
            placeholder="Ask about students, attendance, or request analysis…"
            quickPrompts={[
              'Identify at-risk students',
              'Analyze attendance patterns',
              'Generate report comments',
            ]}
          />
        </TabsContent>

        <TabsContent value="bulk" className="flex-1 m-0 overflow-auto">
          <AIBulkAddStudents />
        </TabsContent>

        <TabsContent value="insights" className="flex-1 m-0 overflow-auto">
          <Card className="glass-card border-border">
            <CardHeader><CardTitle className="text-primary">Automated Insights</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8 text-sm">
                Weekly AI-generated insights on attendance patterns, grade trends, and at-risk students will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
