import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { resolveErrorMessage } from '@/lib/errors';
import Logo from '@/components/brand/Logo';
import PageMeta from '@/components/seo/PageMeta';
import { PageFooter } from '@/components/layout/PageFooter';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { signIn, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (loginSuccess && user && role && !loading) {
      navigate(getDashboardPath(role), { replace: true });
      setIsLoading(false);
      setLoginSuccess(false);
    }
  }, [loginSuccess, user, role, loading, navigate]);

  // Already signed in (e.g. reopening the mobile or desktop app) — go straight in.
  useEffect(() => {
    if (!loading && user && role && !loginSuccess) {
      navigate(getDashboardPath(role), { replace: true });
    }
  }, [user, role, loading, loginSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: 'Couldn’t sign you in',
          description: await resolveErrorMessage(error, 'Incorrect email or password. Please try again.'),
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      toast({ title: 'Welcome back!', description: 'Access granted.' });
      setLoginSuccess(true);
    } catch (err) {
      toast({
        title: 'Couldn’t sign you in',
        description: await resolveErrorMessage(err, 'Something went wrong while signing in. Please try again.'),
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex flex-col aurora-hero cyber-grid">
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative"
      >
        <PageMeta
          title="Sign In | Edunova"
          description="Sign in to Edunova to access teacher, student, and admin dashboards for class management, results, and attendance."
          path="/auth/login"
        />
        <div className="spec-card p-5 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <Logo size={56} priority />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Sign in to Edunova</h1>
            <p className="kicker mt-2">Secure access portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 text-base bg-muted/50 border-border focus:border-primary focus:neon-glow"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 text-base bg-muted/50 border-border focus:border-primary"
                  required
                />
                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 neon-glow" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              No account?{' '}
              <Link to="/auth/register" className="text-primary hover:underline font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
      </div>
      <PageFooter />
    </div>
  );
}
