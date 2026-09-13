import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, ArrowRight, Check, FileText, Globe2, GraduationCap,
  Info, Landmark, Search, Trophy, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  useAdmissionCatalog, useInstitutionDiscovery, useProgramRequirements,
  institutionBadges, type CatalogItem, type DiscoveredInstitution,
} from '@/hooks/useAdmissionCatalog';
import { PageFooter } from '@/components/layout/PageFooter';

type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = ['Country', 'Board', 'Program', 'Institution', 'Requirements'];

function Metric({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</p>
      <p className="text-sm font-semibold">
        {value === null || value === undefined ? (
          <span className="text-muted-foreground">Not available</span>
        ) : (
          <>{value}{suffix}</>
        )}
      </p>
    </div>
  );
}

function PickList({ items, query, onQuery, onPick, empty }: {
  items: CatalogItem[];
  query: string;
  onQuery: (v: string) => void;
  onPick: (item: CatalogItem) => void;
  empty: string;
}) {
  const filtered = useMemo(
    () => items.filter((i) => (i.name + (i.short_name || '')).toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search…" className="pl-9" />
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => onPick(item)}
              className="glass-card flex items-center justify-between gap-3 rounded-2xl p-4 text-left transition-all hover:border-primary/50"
            >
              <span className="min-w-0">
                <span className="block font-medium">{item.short_name || item.name}</span>
                {item.short_name && <span className="block text-xs text-muted-foreground line-clamp-2">{item.name}</span>}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiscoverAdmissionPage() {
  const navigate = useNavigate();
  const { countries, boards, programs, loadBoards, loadPrograms } = useAdmissionCatalog();
  const { items, loading: discovering, discover } = useInstitutionDiscovery();

  const [step, setStep] = useState<Step>(0);
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState<CatalogItem | null>(null);
  const [board, setBoard] = useState<CatalogItem | null>(null);
  const [program, setProgram] = useState<CatalogItem | null>(null);
  const [institution, setInstitution] = useState<DiscoveredInstitution | null>(null);
  const { requirements } = useProgramRequirements(institution?.institution_program_id || null);

  const goto = (s: Step) => { setStep(s); setQuery(''); };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Find & Compare Admissions | Edunova</title>
        <meta
          name="description"
          content="Choose your country, board and program, compare institutions on real performance data, then apply for admission."
        />
      </Helmet>

      <header className="border-b border-border/60">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="text-lg font-semibold">Edunova</Link>
          <Link to="/apply" className="text-sm text-muted-foreground hover:text-primary">Skip to application form</Link>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Apply for admission</h1>
        <p className="mt-2 text-muted-foreground">
          A guided journey: pick where you are applying, compare institutions on real data, then complete the right form.
        </p>

        {/* Steps */}
        <ol className="mt-8 flex flex-wrap items-center gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <button
                onClick={() => i <= step && goto(i as Step)}
                disabled={i > step}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  i === step
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : i < step
                      ? 'border-border text-muted-foreground hover:text-foreground'
                      : 'border-border/50 text-muted-foreground/60'
                }`}
              >
                {i < step ? <Check className="h-3 w-3" /> : <span className="font-mono">{i + 1}</span>}
                {label}
              </button>
              {i < STEPS.length - 1 && <span className="text-muted-foreground/40">/</span>}
            </li>
          ))}
        </ol>

        <div className="mt-8 space-y-6">
          {step === 0 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Globe2 className="h-5 w-5 text-primary" /> Which country are you applying in?
              </h2>
              <PickList
                items={countries}
                query={query}
                onQuery={setQuery}
                empty="No countries available yet."
                onPick={async (c) => { setCountry(c); await loadBoards(c.id); goto(1); }}
              />
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Landmark className="h-5 w-5 text-primary" /> Which board are you applying through?
              </h2>
              <p className="text-sm text-muted-foreground">Boards available in {country?.name}.</p>
              <PickList
                items={boards}
                query={query}
                onQuery={setQuery}
                empty="No boards configured for this country yet."
                onPick={async (b) => { setBoard(b); await loadPrograms(b.id); goto(2); }}
              />
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <GraduationCap className="h-5 w-5 text-primary" /> Which program are you applying for?
              </h2>
              <p className="text-sm text-muted-foreground">{board?.short_name || board?.name}</p>
              <PickList
                items={programs}
                query={query}
                onQuery={setQuery}
                empty="No programs configured for this board yet."
                onPick={async (p) => { setProgram(p); goto(3); await discover(p.id); }}
              />
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Trophy className="h-5 w-5 text-primary" /> Institutions for {program?.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                Ranked for {board?.short_name || board?.name} → {program?.name} only. Rankings differ per board and program.
              </p>

              {discovering ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => <Card key={i} className="glass-card h-40 animate-pulse" />)}
                </div>
              ) : items.length === 0 ? (
                <Card className="glass-card">
                  <CardContent className="space-y-2 p-8 text-center">
                    <Info className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="font-medium">No institution has open admissions for this program yet</p>
                    <p className="text-sm text-muted-foreground">
                      Try another board or program, or use the general application form.
                    </p>
                    <Link to="/apply"><Button variant="outline" className="mt-2">Open application form</Button></Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => {
                    const rank = index + 1;
                    return (
                      <Card key={item.institution_program_id} className="glass-card">
                        <CardContent className="space-y-4 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground">#{rank}</span>
                                <h3 className="text-lg font-semibold">{item.school_name}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground">{item.board_name} · {item.program_name}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {institutionBadges(item, rank).map((b) => (
                                <Badge
                                  key={b}
                                  variant="outline"
                                  className={b === 'Insufficient Data' ? 'text-muted-foreground' : 'border-primary/40 text-primary'}
                                >
                                  {b}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                            <Metric label="Pass rate" value={item.pass_rate} suffix="%" />
                            <Metric label="Attendance" value={item.attendance_rate} suffix="%" />
                            <Metric label="Admission success" value={item.admission_success_rate} suffix="%" />
                            <Metric label="Students" value={item.students_total} />
                            <Metric label="Seats" value={item.seats} />
                            <Metric label="Apps / seat" value={item.applications_per_seat} />
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {item.closes_on && <span>Closes {item.closes_on}</span>}
                            {item.require_test && <span>Entry test required</span>}
                            {item.require_interview && <span>Interview required</span>}
                            {item.fee_amount !== null && <span>Fee {item.fee_amount}</span>}
                          </div>

                          <Button
                            className="gap-2"
                            onClick={() => { setInstitution(item); goto(4); }}
                          >
                            View requirements <ArrowRight className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {step === 4 && institution && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <FileText className="h-5 w-5 text-primary" /> {institution.school_name} — what you need
              </h2>
              {institution.eligibility && (
                <Card className="glass-card"><CardContent className="p-4 text-sm">{institution.eligibility}</CardContent></Card>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {(['information', 'document'] as const).map((kind) => {
                  const list = requirements.filter((r) => r.kind === kind);
                  return (
                    <Card key={kind} className="glass-card">
                      <CardContent className="space-y-2 p-5">
                        <h3 className="flex items-center gap-2 font-semibold">
                          {kind === 'information' ? <Users className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                          {kind === 'information' ? 'Information required' : 'Documents required'}
                        </h3>
                        {list.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Not published by this institution yet.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {list.map((r) => (
                              <li key={r.id} className="flex items-start gap-2 text-sm">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                <span>
                                  {r.label}
                                  {!r.is_required && <span className="text-muted-foreground"> (optional)</span>}
                                  {r.description && <span className="block text-xs text-muted-foreground">{r.description}</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2" onClick={() => goto(3)}>
                  <ArrowLeft className="h-4 w-4" /> Back to institutions
                </Button>
                <Button
                  className="gap-2"
                  onClick={() =>
                    navigate(
                      `/apply?school=${institution.school_id}&program=${institution.institution_program_id}`,
                    )
                  }
                >
                  Complete admission form <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </section>
          )}
        </div>
      </main>
      <PageFooter />
    </div>
  );
}
