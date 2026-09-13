import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PageMeta from '@/components/seo/PageMeta';
import { invokeFn, getErrorMessage } from '@/lib/errors';
import { PageFooter } from '@/components/layout/PageFooter';

export default function ParentLoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!phone.trim()) return toast({ title: 'Enter phone number', variant: 'destructive' });
    setLoading(true);
    try {
      const { data, error } = await invokeFn('parent-direct-login', { body: { phone: phone.trim() } });
      if (error) throw error;
      const res = data as any;
      if (res?.error) throw new Error(res.error);
      if (res.action_link) {
        window.location.href = res.action_link;
        return;
      }
      throw new Error('No login link received');
    } catch (e: any) {
      toast({ title: 'Login failed', description: getErrorMessage(e), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <PageMeta
          title="Parent Login | Edunova"
          description="Parents sign in with the registered mobile number to view your child's attendance, results, fees, and school announcements."
          path="/auth/parent-login"
        />
        <Card className="glass-card border-primary/30">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Parent Login</CardTitle>
            <CardDescription>
              Sign in with the mobile number on your child's record
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile Number</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="03XXXXXXXXX"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && login()}
              />
            </div>
            <Button onClick={login} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Sign In
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              No password or OTP needed — verification is by your registered mobile number.
            </p>
            <div className="text-center pt-2">
              <button onClick={() => navigate('/auth/login')} className="text-xs text-muted-foreground hover:text-primary">
                Are you a teacher or admin? Login here →
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <PageFooter />
    </div>
  );
}
