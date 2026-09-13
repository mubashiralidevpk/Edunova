import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonOverlay } from '@/components/ui/coming-soon-overlay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminExamTerms() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exam Terms & Promotion</h1>
          <p className="text-muted-foreground text-sm">Schedule terms and auto-promote students</p>
        </div>

        <ComingSoonOverlay
          title="Exam Terms Upgrading"
          description="The exam terms and auto-promotion module is being rebuilt alongside the new results system. Available again soon."
        >
          <Card className="glass-card border-border">
            <CardHeader><CardTitle>All Terms</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 rounded bg-muted/40" />
                ))}
              </div>
            </CardContent>
          </Card>
        </ComingSoonOverlay>
      </div>
    </DashboardLayout>
  );
}
