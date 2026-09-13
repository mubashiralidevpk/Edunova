import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { MapPin, Clock, LogOut, AlertTriangle, Hand, CheckCircle, ScanLine, ShieldCheck, Navigation } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTeacherCheckin } from '@/hooks/useTeacherCheckin';
import { useCheckinSystem } from '@/hooks/useCheckinSystem';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { QRScannerDialog } from '@/components/teacher/QRScannerDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function TeacherCheckin() {
  const { todayCheckin, loading: checkinLoading, checkIn, checkOut } = useTeacherCheckin();
  const { impacts, loading: systemLoading, volunteerForClass } = useCheckinSystem();

  const [volunteerDialogOpen, setVolunteerDialogOpen] = useState(false);
  const [selectedImpact, setSelectedImpact] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const { isWithinGeofence } = useSchoolSettings();
  const { toast } = useToast();

  const loading = checkinLoading || systemLoading;

  useEffect(() => {
    if (!('permissions' in navigator)) return;
    // @ts-ignore
    navigator.permissions.query({ name: 'geolocation' }).then((status: PermissionStatus) => {
      setLocationPermission(status.state as any);
      status.onchange = () => setLocationPermission(status.state as any);
    }).catch(() => {});
  }, []);

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      toast({ title: 'GPS not supported on this device', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationPermission('granted');
        toast({ title: 'Location access granted', description: 'You can now scan the school QR to check in.' });
      },
      (err) => {
        setLocationPermission('denied');
        toast({
          title: 'Location access denied',
          description: err.code === 1
            ? 'Enable location for this site in your browser settings, then try again.'
            : 'Unable to get your location. Please try again outdoors.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleQRScan = async (decoded: string) => {
    setCheckingIn(true);
    try {
      let token: string | null = null;
      try {
        const payload = JSON.parse(decoded);
        if (payload?.type === 'aksms-checkin' && payload?.token) token = payload.token;
      } catch {
        token = decoded.trim();
      }
      if (!token) {
        toast({ title: 'Invalid QR', description: 'Not a valid school check-in code.', variant: 'destructive' });
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      const { data: prof } = uid
        ? await supabase.from('profiles').select('school_id').eq('user_id', uid).maybeSingle()
        : { data: null as any };
      const schoolId = prof?.school_id;
      if (!schoolId) {
        toast({ title: 'No school assigned to your account', variant: 'destructive' });
        return;
      }

      const { data: school } = await supabase
        .from('school_settings')
        .select('qr_token, latitude, longitude, geofence_radius_meters, qr_expires_at')
        .eq('school_id', schoolId)
        .maybeSingle();

      if (!school || school.qr_token !== token) {
        toast({ title: 'QR expired or invalid', description: 'Ask admin for the latest QR.', variant: 'destructive' });
        return;
      }

      if (school.qr_expires_at && new Date(school.qr_expires_at).getTime() < Date.now()) {
        toast({ title: 'QR expired', description: 'This code is past its validity. Ask admin to regenerate.', variant: 'destructive' });
        return;
      }

      if (!school.latitude || !school.longitude) {
        toast({ title: 'School location missing', description: 'Admin must set school coordinates first.', variant: 'destructive' });
        return;
      }

      if (!navigator.geolocation) {
        toast({ title: 'GPS required', description: 'Your device does not support location.', variant: 'destructive' });
        return;
      }

      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const ok = isWithinGeofence(pos.coords.latitude, pos.coords.longitude);
            if (!ok) {
              toast({
                title: 'Out of school perimeter',
                description: 'You must be physically inside the school to check in.',
                variant: 'destructive',
              });
              resolve();
              return;
            }
            setQrOpen(false);
            const success = await checkIn({
              coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
              qrToken: token!,
              gpsVerified: true,
            });
            if (success) {
              setQrOpen(false);
            }
            resolve();
          },
          (err) => {
            setLocationPermission(err.code === 1 ? 'denied' : 'prompt');
            toast({
              title: 'Location required',
              description: err.code === 1
                ? 'You blocked location. Enable it in your browser settings and try again.'
                : 'Could not get GPS fix. Move where signal is better and retry.',
              variant: 'destructive',
            });
            resolve();
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleVolunteer = async () => {
    if (!selectedImpact) return;
    await volunteerForClass(selectedImpact.id);
    setVolunteerDialogOpen(false);
    setSelectedImpact(null);
  };

  const openImpacts = impacts.filter((i) => i.status === 'impacted');

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Check-in</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • Cutoff: 8:30 AM
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Today's Status
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                QR + GPS verification required
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayCheckin ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={
                      todayCheckin.status === 'present' ? 'bg-accent text-accent-foreground' :
                      todayCheckin.status === 'late' ? 'bg-[hsl(45,100%,55%)] text-background' :
                      'bg-destructive text-destructive-foreground'
                    }>
                      {todayCheckin.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Check-in</span>
                    <span className="font-mono">{format(new Date(todayCheckin.checkin_time), 'h:mm:ss a')}</span>
                  </div>
                  {todayCheckin.checkout_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Check-out</span>
                      <span className="font-mono">{format(new Date(todayCheckin.checkout_time), 'h:mm:ss a')}</span>
                    </div>
                  )}
                  {todayCheckin.location_coordinates && (
                    <div className="flex items-center gap-2 text-sm text-accent">
                      <MapPin className="h-4 w-4" /> Location verified
                    </div>
                  )}
                  {!todayCheckin.checkout_time && (
                    <Button onClick={checkOut} className="w-full" variant="outline">
                      <LogOut className="h-4 w-4 mr-2" /> Check Out
                    </Button>
                  )}
                  {todayCheckin.checkout_time && (
                    <div className="text-center p-3 bg-accent/10 rounded-lg">
                      <CheckCircle className="h-8 w-8 mx-auto text-accent mb-2" />
                      <p className="text-sm text-accent font-medium">Day completed</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="py-8">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                      <ScanLine className="h-16 w-16 mx-auto text-primary mb-4" />
                    </motion.div>
                    <p className="text-foreground font-medium">Scan today's school QR to check in</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You must be inside the school perimeter — fake check-ins are blocked.
                    </p>
                  </div>

                  {locationPermission !== 'granted' && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-left space-y-2">
                      <div className="flex items-start gap-2">
                        <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Location permission required.</span>{' '}
                          The system compares your GPS to the school coordinates to confirm you are physically on campus.
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={requestLocationPermission} className="w-full gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        {locationPermission === 'denied' ? 'Location blocked — open settings' : 'Allow location access'}
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={() => setQrOpen(true)}
                    disabled={checkingIn || locationPermission === 'denied'}
                    className="w-full"
                    size="lg"
                  >
                    <ScanLine className="h-4 w-4 mr-2" />
                    {checkingIn ? 'Verifying...' : 'Scan QR to Check In'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
                Classes Needing Coverage
              </CardTitle>
              <CardDescription>{openImpacts.length} class(es) impacted today</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {openImpacts.length > 0 ? (
                  <div className="space-y-3">
                    {openImpacts.map((impact) => (
                      <motion.div
                        key={impact.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-muted/30 rounded-lg space-y-2 border border-destructive/20"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{impact.classes?.class_name} - {impact.subject || impact.classes?.subject}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              Period {impact.period} {impact.time_slot && `• ${impact.time_slot}`}
                            </p>
                          </div>
                          <Badge variant="destructive">Impacted</Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => { setSelectedImpact(impact); setVolunteerDialogOpen(true); }}
                          className="w-full gap-2"
                        >
                          <Hand className="h-4 w-4" /> I'll Take This Class
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-accent" />
                    <p>All classes covered today</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <QRScannerDialog open={qrOpen} onOpenChange={setQrOpen} onScan={handleQRScan} />

      <Dialog open={volunteerDialogOpen} onOpenChange={setVolunteerDialogOpen}>
        <DialogContent className="glass-card border-primary/10">
          <DialogHeader>
            <DialogTitle>Volunteer to Cover Class</DialogTitle>
          </DialogHeader>
          {selectedImpact && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium">{selectedImpact.classes?.class_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedImpact.subject || selectedImpact.classes?.subject} • Period {selectedImpact.period}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVolunteerDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVolunteer}>Confirm Volunteer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
