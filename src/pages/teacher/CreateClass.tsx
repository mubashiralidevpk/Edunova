import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { ALL_CLASS_LEVELS } from '@/lib/admissionStatus';
const LEVELS = ALL_CLASS_LEVELS;
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function CreateClass() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [level, setLevel] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a class.',
        variant: 'destructive',
      });
      return;
    }

    if (!level || !section || !subject.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const resolveSchoolId = async (): Promise<string | null> => {
        const [{ data: prof }, { data: ownedSchool }] = await Promise.all([
          supabase.from('profiles').select('school_id').eq('user_id', user.id).maybeSingle(),
          supabase.from('schools').select('id').eq('owner_admin_id', user.id).maybeSingle(),
        ]);
        return (prof?.school_id as string | null) ?? (ownedSchool?.id as string | null) ?? null;
      };

      let schoolId = await resolveSchoolId();

      // Self-heal: link (or create) the school for this account, then try again.
      if (!schoolId) {
        const { error: ensureError } = await supabase.rpc('ensure_my_account' as any);
        if (ensureError) {
          throw new Error(
            'Your account is not linked to a school yet, and we could not set it up automatically. ' +
            'Please sign out, sign in again, and try once more.',
          );
        }
        schoolId = await resolveSchoolId();
      }

      if (!schoolId) {
        throw new Error('Your account is not linked to a school yet. Please sign out and sign in again.');
      }

      const { data, error } = await supabase
        .from('classes')
        .insert({
          teacher_id: user.id,
          level: parseInt(level),
          section: section,
          subject: subject.trim(),
          school_id: schoolId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Duplicate class',
            description: `A class for ${level}-${section} ${subject} already exists.`,
            variant: 'destructive',
          });
          return;
        }
        if (error.code === '42501' || /row-level security/i.test(error.message)) {
          throw new Error(
            'You do not have permission to create a class for this school. ' +
            'Only an administrator or a teacher of this school can create classes.',
          );
        }
        throw new Error(error.message);
      }

      toast({
        title: 'Class created',
        description: `${level}-${section} ${subject} has been created successfully.`,
      });

      navigate(role === 'admin' ? '/admin/classes' : `/teacher/classes/${data.id}`);
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: 'Could not create the class',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Create New Class</CardTitle>
                  <CardDescription>
                    Add a new class to start managing students and attendance
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="level">Class Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger id="level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={l.toString()}>
                            Class {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Select value={section} onValueChange={setSection}>
                      <SelectTrigger id="section">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            Section {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Mathematics, English, Science"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {level && section && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Class Preview: <span className="font-semibold text-foreground">{level}-{section}</span>
                      {subject && <span className="text-foreground"> - {subject}</span>}
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Class'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
