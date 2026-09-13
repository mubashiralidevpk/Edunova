import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User as UserIcon, Lock, Bell, Palette, Shield, Globe, Volume2,
  Eye, Smartphone, Mail, Save, Loader2, Trash2, LogOut, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import PageMeta from '@/components/seo/PageMeta';
import { getErrorMessage } from '@/lib/errors';

type Prefs = Record<string, unknown>;

const DEFAULT_PREFS: Prefs = {
  // Notifications (10)
  notif_announcements: true,
  notif_attendance: true,
  notif_results: true,
  notif_messages: true,
  notif_assignments: true,
  notif_reminders: true,
  notif_email: false,
  notif_sms: false,
  notif_sound: true,
  notif_desktop: true,
  // Appearance (8)
  theme: 'dark',
  accent_color: 'cyan',
  font_size: 16,
  font_family: 'inter',
  reduce_motion: false,
  high_contrast: false,
  compact_mode: false,
  show_avatars: true,
  // Privacy (8)
  show_online_status: true,
  read_receipts: true,
  typing_indicators: true,
  searchable_profile: true,
  share_activity: false,
  share_analytics: true,
  allow_dm: true,
  block_unknown: false,
  // Audio (5)
  master_volume: 70,
  message_sound: true,
  notification_sound: true,
  ui_sound: true,
  voice_assistant: false,
  // Language & Region (4)
  language: 'en',
  date_format: 'DD/MM/YYYY',
  time_format: '12h',
  timezone: 'Asia/Kolkata',
  // Accessibility (5)
  screen_reader: false,
  keyboard_nav: true,
  focus_indicators: true,
  caption_videos: false,
  dyslexia_font: false,
  // Performance (4)
  auto_play_videos: true,
  preload_images: true,
  background_sync: true,
  data_saver: false,
  // Security (5)
  two_factor: false,
  login_alerts: true,
  session_timeout: 60,
  require_pwd_actions: false,
  device_history: true,
  // Productivity (5)
  default_landing: 'dashboard',
  quick_actions: true,
  show_tips: true,
  beta_features: false,
  ai_suggestions: true,
};

function loadPrefs(userId: string | undefined): Prefs {
  if (!userId) return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(`aksms.prefs.${userId}`);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(userId: string, prefs: Prefs) {
  localStorage.setItem(`aksms.prefs.${userId}`, JSON.stringify(prefs));
}

export default function SettingsPage() {
  const { user, profile, role, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email] = useState(profile?.email || user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(user?.id));

  useEffect(() => {
    setPrefs(loadPrefs(user?.id));
    setFullName(profile?.full_name || '');
  }, [user?.id, profile?.full_name]);

  const updatePref = (key: string, value: unknown) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (user?.id) savePrefs(user.id, next);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('user_id', user.id);
    setSavingProfile(false);
    if (error) {
      toast({ title: 'Update failed', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    await refreshProfile();
    toast({ title: 'Profile updated' });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setChangingPwd(true);
    // Re-verify current password by signing in again
    if (currentPassword && email) {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (verifyErr) {
        setChangingPwd(false);
        toast({ title: 'Current password incorrect', variant: 'destructive' });
        return;
      }
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPwd(false);
    if (error) {
      toast({ title: 'Password change failed', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast({ title: 'Password updated', description: 'Use your new password next time.' });
  };

  const handleSignOutAll = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const handleResetPrefs = () => {
    if (!user?.id) return;
    setPrefs(DEFAULT_PREFS);
    savePrefs(user.id, DEFAULT_PREFS);
    toast({ title: 'Preferences reset' });
  };

  const ToggleRow = ({
    label, hint, prefKey,
  }: { label: string; hint?: string; prefKey: string }) => (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5 pr-4">
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch
        checked={Boolean(prefs[prefKey])}
        onCheckedChange={(v) => updatePref(prefKey, v)}
      />
    </div>
  );

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-5xl"
      >
        <PageMeta
          title="Account Settings | Edunova"
          description="Manage your Edunova account: profile, password, notifications, appearance, privacy, and accessibility preferences."
          path="/settings"
        />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personalize your Edunova experience — {role || 'user'} preferences.
          </p>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 h-auto">
            <TabsTrigger value="account"><UserIcon className="h-3.5 w-3.5 mr-1" />Account</TabsTrigger>
            <TabsTrigger value="security"><Lock className="h-3.5 w-3.5 mr-1" />Security</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5 mr-1" />Notify</TabsTrigger>
            <TabsTrigger value="appearance"><Palette className="h-3.5 w-3.5 mr-1" />Look</TabsTrigger>
            <TabsTrigger value="privacy"><Shield className="h-3.5 w-3.5 mr-1" />Privacy</TabsTrigger>
            <TabsTrigger value="audio"><Volume2 className="h-3.5 w-3.5 mr-1" />Audio</TabsTrigger>
            <TabsTrigger value="language"><Globe className="h-3.5 w-3.5 mr-1" />Region</TabsTrigger>
            <TabsTrigger value="accessibility"><Eye className="h-3.5 w-3.5 mr-1" />A11y</TabsTrigger>
            <TabsTrigger value="advanced"><Sparkles className="h-3.5 w-3.5 mr-1" />Advanced</TabsTrigger>
          </TabsList>

          {/* ACCOUNT */}
          <TabsContent value="account" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your public profile information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} disabled />
                  <p className="text-xs text-muted-foreground">Email is managed by your administrator.</p>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={role || ''} disabled className="capitalize" />
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
                <CardDescription>Use a strong password you don't reuse elsewhere.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Current password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Confirm new password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button onClick={handleChangePassword} disabled={changingPwd || !newPassword}>
                  {changingPwd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                  Update password
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security preferences</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <ToggleRow label="Two-factor authentication" hint="Require a second step at sign-in (coming soon)" prefKey="two_factor" />
                <ToggleRow label="Email me on new sign-ins" prefKey="login_alerts" />
                <ToggleRow label="Require password for sensitive actions" prefKey="require_pwd_actions" />
                <ToggleRow label="Keep device history" prefKey="device_history" />
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm">Auto sign-out after inactivity</Label>
                    <p className="text-xs text-muted-foreground">{prefs.session_timeout as number} minutes</p>
                  </div>
                  <div className="w-40">
                    <Slider
                      min={15} max={240} step={15}
                      value={[prefs.session_timeout as number]}
                      onValueChange={([v]) => updatePref('session_timeout', v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleSignOutAll}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out of this session
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOTIFICATIONS */}
          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>What you get notified about</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <ToggleRow label="Announcements" prefKey="notif_announcements" />
                <ToggleRow label="Attendance updates" prefKey="notif_attendance" />
                <ToggleRow label="Results & grades" prefKey="notif_results" />
                <ToggleRow label="Direct messages" prefKey="notif_messages" />
                <ToggleRow label="Assignments & deadlines" prefKey="notif_assignments" />
                <ToggleRow label="Daily reminders" prefKey="notif_reminders" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>How you're notified</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <ToggleRow label="Email notifications" hint="Sent to your account email" prefKey="notif_email" />
                <ToggleRow label="SMS notifications" hint="Carrier rates may apply" prefKey="notif_sms" />
                <ToggleRow label="Desktop push" prefKey="notif_desktop" />
                <ToggleRow label="Sound for notifications" prefKey="notif_sound" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPEARANCE */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>Theme & layout</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={prefs.theme as string} onValueChange={(v) => updatePref('theme', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Cyber Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="system">Match system</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent color</Label>
                    <Select value={prefs.accent_color as string} onValueChange={(v) => updatePref('accent_color', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cyan">Cyan (default)</SelectItem>
                        <SelectItem value="violet">Violet</SelectItem>
                        <SelectItem value="emerald">Emerald</SelectItem>
                        <SelectItem value="amber">Amber</SelectItem>
                        <SelectItem value="rose">Rose</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Font family</Label>
                    <Select value={prefs.font_family as string} onValueChange={(v) => updatePref('font_family', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inter">Inter</SelectItem>
                        <SelectItem value="mono">Monospace</SelectItem>
                        <SelectItem value="serif">Serif</SelectItem>
                        <SelectItem value="dyslexic">OpenDyslexic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Font size — {prefs.font_size as number}px</Label>
                    <Slider
                      min={12} max={22} step={1}
                      value={[prefs.font_size as number]}
                      onValueChange={([v]) => updatePref('font_size', v)}
                    />
                  </div>
                </div>
                <Separator />
                <div className="divide-y">
                  <ToggleRow label="Reduce motion" prefKey="reduce_motion" />
                  <ToggleRow label="High contrast" prefKey="high_contrast" />
                  <ToggleRow label="Compact mode" prefKey="compact_mode" />
                  <ToggleRow label="Show avatars" prefKey="show_avatars" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PRIVACY */}
          <TabsContent value="privacy" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
              <CardContent className="divide-y">
                <ToggleRow label="Show online status" prefKey="show_online_status" />
                <ToggleRow label="Read receipts" prefKey="read_receipts" />
                <ToggleRow label="Typing indicators" prefKey="typing_indicators" />
                <ToggleRow label="Allow others to find me" prefKey="searchable_profile" />
                <ToggleRow label="Share my activity with teachers" prefKey="share_activity" />
                <ToggleRow label="Help improve Edunova with anonymous analytics" prefKey="share_analytics" />
                <ToggleRow label="Allow direct messages" prefKey="allow_dm" />
                <ToggleRow label="Block messages from unknown users" prefKey="block_unknown" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIO */}
          <TabsContent value="audio" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>Sound</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Master volume — {prefs.master_volume as number}%</Label>
                  <Slider
                    min={0} max={100} step={5}
                    value={[prefs.master_volume as number]}
                    onValueChange={([v]) => updatePref('master_volume', v)}
                  />
                </div>
                <Separator />
                <div className="divide-y">
                  <ToggleRow label="Message sounds" prefKey="message_sound" />
                  <ToggleRow label="Notification sounds" prefKey="notification_sound" />
                  <ToggleRow label="UI click sounds" prefKey="ui_sound" />
                  <ToggleRow label="Voice assistant" hint="Read announcements aloud" prefKey="voice_assistant" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LANGUAGE */}
          <TabsContent value="language" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>Language & region</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={prefs.language as string} onValueChange={(v) => updatePref('language', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                      <SelectItem value="ur">اردو (Urdu)</SelectItem>
                      <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                      <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                      <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date format</Label>
                  <Select value={prefs.date_format as string} onValueChange={(v) => updatePref('date_format', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time format</Label>
                  <Select value={prefs.time_format as string} onValueChange={(v) => updatePref('time_format', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={prefs.timezone as string} onValueChange={(v) => updatePref('timezone', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCESSIBILITY */}
          <TabsContent value="accessibility" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>Accessibility</CardTitle></CardHeader>
              <CardContent className="divide-y">
                <ToggleRow label="Screen reader optimizations" prefKey="screen_reader" />
                <ToggleRow label="Enhanced keyboard navigation" prefKey="keyboard_nav" />
                <ToggleRow label="Visible focus indicators" prefKey="focus_indicators" />
                <ToggleRow label="Caption videos by default" prefKey="caption_videos" />
                <ToggleRow label="Use dyslexia-friendly font" prefKey="dyslexia_font" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADVANCED */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
              <CardContent className="divide-y">
                <ToggleRow label="Auto-play videos" prefKey="auto_play_videos" />
                <ToggleRow label="Preload images" prefKey="preload_images" />
                <ToggleRow label="Background sync" prefKey="background_sync" />
                <ToggleRow label="Data saver" hint="Reduce image quality on slow networks" prefKey="data_saver" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Productivity</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default landing page</Label>
                  <Select value={prefs.default_landing as string} onValueChange={(v) => updatePref('default_landing', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="classes">Classes</SelectItem>
                      <SelectItem value="results">Results</SelectItem>
                      <SelectItem value="announcements">Announcements</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="divide-y">
                  <ToggleRow label="Show quick actions" prefKey="quick_actions" />
                  <ToggleRow label="Show tips & onboarding hints" prefKey="show_tips" />
                  <ToggleRow label="Enable beta features" prefKey="beta_features" />
                  <ToggleRow label="AI suggestions" prefKey="ai_suggestions" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reset</CardTitle>
                <CardDescription>Restore all preferences on this device.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleResetPrefs}>
                  <Trash2 className="h-4 w-4 mr-2" /> Reset preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}
