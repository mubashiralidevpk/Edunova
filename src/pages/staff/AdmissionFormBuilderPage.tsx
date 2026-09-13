import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdmissionFormBuilder } from '@/components/admissions/AdmissionFormBuilder';
import { useStaffRoles } from '@/hooks/useStaffRoles';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, ClipboardList } from 'lucide-react';

export default function AdmissionFormBuilderPage() {
  const { isAdmissionManager, loading } = useStaffRoles();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" /> Admission Form Builder
          </h1>
          <p className="text-muted-foreground">
            Customize what applicants must submit — text, options, attachments and mandatory rules.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Checking your permissions…</p>
        ) : !isAdmissionManager ? (
          <Card className="glass-card border-border">
            <CardContent className="p-8 text-center space-y-2">
              <ShieldAlert className="h-10 w-10 mx-auto text-destructive" />
              <p className="font-medium">Admission Manager access required</p>
              <p className="text-sm text-muted-foreground">
                Ask your school admin to assign you the Admission Manager, Principal or Vice Principal role.
              </p>
            </CardContent>
          </Card>
        ) : (
          <AdmissionFormBuilder />
        )}
      </div>
    </DashboardLayout>
  );
}
