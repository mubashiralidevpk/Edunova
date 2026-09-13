import { useEffect, useState } from 'react';
import { MapPin, QrCode, RefreshCw, Save, Settings, Timer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';

interface SchoolSettings {
  id: string;
  school_name: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  checkin_deadline: string;
  qr_token: string | null;
  qr_expires_at: string | null;
  qr_validity_minutes: number;
}

interface CheckinConfigCardProps {
  defaultTab?: 'location' | 'qr';
}

export function CheckinConfigCard({ defaultTab = 'location' }: CheckinConfigCardProps = {}) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      let schoolId: string | null = null;
      if (uid) {
        const { data: prof } = await supabase.from('profiles').select('school_id').eq('user_id', uid).maybeSingle();
        schoolId = prof?.school_id ?? null;
      }
      if (!schoolId) {
        toast({ title: 'No school assigned to your account', variant: 'destructive' });
        setLoading(false);
        return;
      }
      let { data } = await supabase.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle();
      if (!data) {
        const inserted = await supabase
          .from('school_settings')
          .insert({ school_name: 'Edunova', school_id: schoolId })
          .select('*')
          .maybeSingle();
        data = inserted.data;
        if (inserted.error) {
          toast({ title: 'Could not initialize settings', description: inserted.error.message, variant: 'destructive' });
        }
      }
      if (data) setSettings(data as SchoolSettings);
      setLoading(false);
    })();
  }, [toast]);

  const updateField = (field: keyof SchoolSettings, value: any) =>
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateField('latitude', Number(pos.coords.latitude.toFixed(6)));
        updateField('longitude', Number(pos.coords.longitude.toFixed(6)));
        toast({ title: 'Location captured', description: 'Click Save to apply.' });
      },
      () => toast({ title: 'Could not get location', variant: 'destructive' }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from('school_settings')
      .update({
        school_name: settings.school_name,
        latitude: settings.latitude,
        longitude: settings.longitude,
        geofence_radius_meters: settings.geofence_radius_meters,
        checkin_deadline: settings.checkin_deadline,
      })
      .eq('id', settings.id);
    setSaving(false);
    if (error) toast({ title: 'Failed to save', description: getErrorMessage(error), variant: 'destructive' });
    else toast({ title: 'Settings saved' });
  };

  const regenerateQR = async () => {
    if (!settings) return;
    setRegenerating(true);
    const newToken = crypto.randomUUID();
    const minutes = Math.max(1, Number(settings.qr_validity_minutes) || 60);
    const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
    const { error } = await supabase
      .from('school_settings')
      .update({
        qr_token: newToken,
        qr_generated_at: new Date().toISOString(),
        qr_expires_at: expiresAt,
        qr_validity_minutes: minutes,
      })
      .eq('id', settings.id);
    setRegenerating(false);
    if (error) toast({ title: 'Failed to regenerate QR', variant: 'destructive' });
    else {
      setSettings({ ...settings, qr_token: newToken, qr_expires_at: expiresAt, qr_validity_minutes: minutes });
      toast({ title: 'QR regenerated', description: `Valid for ${minutes} minute(s).` });
    }
  };

  if (loading || !settings) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading check-in config...</CardContent>
      </Card>
    );
  }

  const qrPayload = JSON.stringify({
    type: 'aksms-checkin',
    token: settings.qr_token,
    expires_at: settings.qr_expires_at,
    v: 2,
  });

  const expiryMs = settings.qr_expires_at ? new Date(settings.qr_expires_at).getTime() - Date.now() : null;
  const isExpired = expiryMs !== null && expiryMs <= 0;
  const expiryLabel = expiryMs === null
    ? 'No expiry set — regenerate to activate'
    : isExpired
      ? 'EXPIRED — regenerate to issue a fresh QR'
      : `Expires ${new Date(settings.qr_expires_at!).toLocaleString()}`;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5 text-primary" /> Check-in Configuration
        </CardTitle>
        <CardDescription>School coordinates, geofence and daily QR — used to validate teacher check-ins.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="space-y-4" key={defaultTab}>
          <TabsList>
            <TabsTrigger value="location"><MapPin className="h-4 w-4 mr-1.5" />Coordinates & Geofence</TabsTrigger>
            <TabsTrigger value="qr"><QrCode className="h-4 w-4 mr-1.5" />Check-in QR</TabsTrigger>
          </TabsList>

          <TabsContent value="location" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={settings.latitude ?? ''}
                  onChange={(e) => updateField('latitude', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={settings.longitude ?? ''}
                  onChange={(e) => updateField('longitude', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>
            <Button variant="outline" onClick={useMyLocation} className="gap-2">
              <MapPin className="h-4 w-4" /> Use my current location
            </Button>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Geofence radius (meters)</Label>
                <Input
                  type="number"
                  value={settings.geofence_radius_meters}
                  onChange={(e) => updateField('geofence_radius_meters', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-in deadline</Label>
                <Input
                  type="time"
                  value={settings.checkin_deadline?.slice(0, 5) || '08:15'}
                  onChange={(e) => updateField('checkin_deadline', e.target.value + ':00')}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save settings'}
            </Button>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-primary" />
                QR validity (minutes)
              </Label>
              <Input
                type="number"
                min={1}
                value={settings.qr_validity_minutes}
                onChange={(e) => updateField('qr_validity_minutes', Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground">
                Applied next time you regenerate. Common values: 5 (strict), 60 (1 hour), 480 (full school day).
              </p>
            </div>

            <div className={`flex justify-center p-6 rounded-lg ${isExpired ? 'bg-destructive/10 border border-destructive/30' : 'bg-white'}`}>
              <QRCodeSVG value={qrPayload} size={220} level="H" includeMargin />
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs text-muted-foreground font-mono break-all">
                Token: {settings.qr_token?.slice(0, 8)}…
              </div>
              <div className={`text-xs font-medium ${isExpired ? 'text-destructive' : 'text-accent'}`}>
                {expiryLabel}
              </div>
            </div>
            <Button variant="outline" onClick={regenerateQR} disabled={regenerating} className="w-full gap-2">
              <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Regenerating...' : `Regenerate QR (valid ${settings.qr_validity_minutes} min)`}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}