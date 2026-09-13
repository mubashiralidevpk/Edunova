import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Terminal, MessageSquare, Search, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdmissionChat } from '@/components/admissions/AdmissionChat';
import PageMeta from '@/components/seo/PageMeta';
import { getErrorMessage } from '@/lib/errors';
import Logo from '@/components/brand/Logo';
import { PageFooter } from '@/components/layout/PageFooter';

interface Ctx { applicant_id: string; full_name: string; school_name: string; status: string; }

export default function AdmissionChatPage() {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [bForm, setBForm] = useState(params.get('bform') || '');
  const [dob, setDob] = useState(params.get('dob') || '');
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!bForm.trim() || !dob) {
      toast({ title: 'Enter B-Form and date of birth', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('applicant_chat_context', {
      _b_form_number: bForm.trim(),
      _date_of_birth: dob,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Lookup failed', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    const row = (data as Ctx[])?.[0];
    if (!row) {
      toast({ title: 'No matching application', description: 'Check B-Form and date of birth.', variant: 'destructive' });
      return;
    }
    setCtx(row);
  };

  useEffect(() => {
    if (params.get('bform') && params.get('dob')) lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background cyber-grid flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={36} priority />
            <span className="font-bold tracking-tight text-foreground">Edu<span className="text-primary">nova</span></span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Home</Button>
          </Link>
        </div>
      </header>

      <main className="container py-8 max-w-3xl flex-1 flex flex-col">
        <PageMeta
          title="Chat with Admissions | Edunova"
          description="Securely message the school's admissions team about your child's application. Verify with B-Form number and date of birth."
          path="/admission-chat"
        />
        <div className="mb-6 text-center">
          <Badge variant="outline" className="mb-3">No account needed</Badge>
          <h1 className="text-3xl font-bold text-foreground">
            Chat with the <span className="text-primary neon-text">School</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Securely message the admissions team about your child's application.
          </p>
        </div>

        {!ctx ? (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-primary" /> Verify your application
              </CardTitle>
              <CardDescription>Both fields must match what you submitted.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>B-Form number</Label>
                  <Input value={bForm} onChange={(e) => setBForm(e.target.value)} maxLength={50} placeholder="xxxxx-xxxxxxx-x" />
                </div>
                <div className="space-y-2">
                  <Label>Date of birth</Label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
              </div>
              <Button onClick={lookup} disabled={loading} className="w-full gap-2" size="lg">
                <MessageSquare className="h-4 w-4" />
                {loading ? 'Verifying...' : 'Open chat'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-primary" /> {ctx.school_name}
              </CardTitle>
              <CardDescription>
                Conversation about <span className="font-medium text-foreground">{ctx.full_name}</span>
                {' '}<Badge variant="outline" className="ml-1 text-xs">{ctx.status}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 pb-3">
              <div className="flex-1 min-h-0 h-[60vh]">
                <AdmissionChat asSender="applicant" bForm={bForm} dob={dob} className="h-full" />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <PageFooter />
    </div>
  );
}
