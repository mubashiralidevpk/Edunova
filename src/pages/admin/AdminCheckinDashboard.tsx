import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Clock, AlertTriangle, CheckCircle, XCircle, Users, Shield,
  Search, Download, RefreshCw, Eye, MessageSquare, Zap, MapPin, QrCode,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCheckinSystem } from '@/hooks/useCheckinSystem';
import { CheckinConfigCard } from '@/components/admin/CheckinConfigCard';

export default function AdminCheckinDashboard() {
  const {
    checkins, impacts, loading,
    calculateImpact, approveReplacement, adminReviewCheckin,
  } = useCheckinSystem();

  const [reviewDialog, setReviewDialog] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState<any>(null);
  const [selectedImpact, setSelectedImpact] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState('present');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [approveRemarks, setApproveRemarks] = useState('');
  const [search, setSearch] = useState('');
  const [configTab, setConfigTab] = useState<'location' | 'qr'>('location');

  const focusConfig = (tab: 'location' | 'qr') => {
    setConfigTab(tab);
    setTimeout(() => {
      document.getElementById('checkin-config')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const presentCount = checkins.filter(c => c.status === 'present').length;
  const lateCount = checkins.filter(c => c.status === 'late').length;
  const impactedCount = impacts.filter(i => i.status === 'impacted').length;
  const resolvedCount = impacts.filter(i => i.status === 'replacement_approved' || i.status === 'resolved').length;

  const handleReview = async () => {
    if (!selectedCheckin) return;
    await adminReviewCheckin(selectedCheckin.id, reviewStatus, reviewRemarks);
    setReviewDialog(false);
    setReviewRemarks('');
  };

  const handleApprove = async () => {
    if (!selectedImpact) return;
    await approveReplacement(selectedImpact.id, approveRemarks);
    setApproveDialog(false);
    setApproveRemarks('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge className="bg-accent text-accent-foreground">Present</Badge>;
      case 'late': return <Badge className="bg-[hsl(45,100%,55%)] text-background">Late</Badge>;
      case 'absent': return <Badge variant="destructive">Absent</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getImpactStatusBadge = (status: string) => {
    switch (status) {
      case 'impacted': return <Badge variant="destructive">⚠ Impacted</Badge>;
      case 'volunteer_pending': return <Badge className="bg-[hsl(45,100%,55%)] text-background">Volunteer Pending</Badge>;
      case 'replacement_approved': return <Badge className="bg-accent text-accent-foreground">Resolved</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Check-in Dashboard</h1>
            <p className="text-muted-foreground font-mono text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => focusConfig('location')} variant="outline" className="gap-2">
              <MapPin className="h-4 w-4" /> Set Coordinates
            </Button>
            <Button onClick={() => focusConfig('qr')} className="gap-2">
              <QrCode className="h-4 w-4" /> Create QR
            </Button>
            <Button onClick={calculateImpact} variant="outline" className="gap-2">
              <Zap className="h-4 w-4" /> Calculate Impact
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Checked In" value={checkins.length} icon={CheckCircle} description="Total today" />
          <StatCard title="On Time" value={presentCount} icon={Clock} description="Before cutoff" />
          <StatCard title="Late" value={lateCount} icon={AlertTriangle} description="After 8:30 AM" />
          <StatCard title="Impacted Classes" value={impactedCount} icon={XCircle} description={`${resolvedCount} resolved`} />
        </div>

        <div id="checkin-config">
          <CheckinConfigCard defaultTab={configTab} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Daily Register */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" /> Daily Register
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {checkins.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No check-ins recorded today</p>
                ) : (
                  <div className="space-y-2">
                    {checkins.map(checkin => (
                      <motion.div
                        key={checkin.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {checkin.teacher_profile?.full_name?.[0] || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{checkin.teacher_profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {format(new Date(checkin.checkin_time), 'h:mm a')}
                              {checkin.is_locked && ' 🔒'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(checkin.status)}
                          {!checkin.is_locked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCheckin(checkin);
                                setReviewStatus(checkin.status);
                                setReviewDialog(true);
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Class Impacts */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-destructive-foreground" /> Class Impacts
              </CardTitle>
              <CardDescription>Classes affected by teacher absences</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {impacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-accent" />
                    <p>No impacted classes today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {impacts.map(impact => (
                      <motion.div
                        key={impact.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 bg-muted/30 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{impact.classes?.class_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Period {impact.period} • {impact.subject || impact.classes?.subject}
                              {impact.time_slot && ` • ${impact.time_slot}`}
                            </p>
                          </div>
                          {getImpactStatusBadge(impact.status)}
                        </div>
                        <p className="text-xs">
                          <span className="text-muted-foreground">Absent: </span>
                          {impact.teacher_profile?.full_name || 'Unknown'}
                        </p>
                        {impact.substitute_profile && (
                          <p className="text-xs">
                            <span className="text-muted-foreground">Substitute: </span>
                            {impact.substitute_profile.full_name}
                          </p>
                        )}
                        {impact.status === 'volunteer_pending' && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setSelectedImpact(impact);
                              setApproveDialog(true);
                            }}
                          >
                            <Shield className="h-3 w-3 mr-1" /> Approve Replacement
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Check-in Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="glass-card border-primary/10">
          <DialogHeader>
            <DialogTitle>Review Check-in</DialogTitle>
          </DialogHeader>
          {selectedCheckin && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">{selectedCheckin.teacher_profile?.full_name}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  Checked in: {format(new Date(selectedCheckin.checkin_time), 'h:mm a')}
                </p>
                <p className="text-sm">Current status: {selectedCheckin.status}</p>
              </div>
              <div className="space-y-2">
                <Label>Set Status</Label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Present (Late)</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Admin Remarks *</Label>
                <Textarea
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                  placeholder="Justification for this review..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>Cancel</Button>
            <Button onClick={handleReview} disabled={!reviewRemarks}>Confirm & Lock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Replacement Dialog */}
      <Dialog open={approveDialog} onOpenChange={setApproveDialog}>
        <DialogContent className="glass-card border-primary/10">
          <DialogHeader>
            <DialogTitle>Approve Replacement</DialogTitle>
          </DialogHeader>
          {selectedImpact && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">{selectedImpact.classes?.class_name} - Period {selectedImpact.period}</p>
                <p className="text-sm text-muted-foreground">Absent: {selectedImpact.teacher_profile?.full_name}</p>
                <p className="text-sm text-accent">Volunteer: {selectedImpact.substitute_profile?.full_name}</p>
              </div>
              <div className="space-y-2">
                <Label>Remarks (optional)</Label>
                <Textarea
                  value={approveRemarks}
                  onChange={e => setApproveRemarks(e.target.value)}
                  placeholder="Any notes..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(false)}>Cancel</Button>
            <Button onClick={handleApprove}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
