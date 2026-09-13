import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  short_name?: string | null;
}

export interface DiscoveredInstitution {
  institution_program_id: string;
  school_id: string;
  school_name: string;
  board_name: string;
  program_name: string;
  seats: number | null;
  admission_status: string;
  opens_on: string | null;
  closes_on: string | null;
  eligibility: string | null;
  fee_amount: number | null;
  merit_note: string | null;
  require_test: boolean;
  require_interview: boolean;
  students_total: number;
  attendance_rate: number | null;
  pass_rate: number | null;
  applications_total: number;
  admissions_total: number;
  admission_success_rate: number | null;
  applications_per_seat: number | null;
  score: number;
  has_data: boolean;
}

export interface ProgramRequirement {
  id: string;
  label: string;
  description: string | null;
  kind: 'information' | 'document';
  is_required: boolean;
  sort_order: number;
}

/** Countries → boards → programs catalogue (public). */
export function useAdmissionCatalog() {
  const [countries, setCountries] = useState<CatalogItem[]>([]);
  const [boards, setBoards] = useState<CatalogItem[]>([]);
  const [programs, setPrograms] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await db
        .from('admission_countries')
        .select('id, code, name')
        .eq('is_active', true)
        .order('sort_order');
      setCountries(data || []);
      setLoading(false);
    })();
  }, []);

  const loadBoards = useCallback(async (countryId: string) => {
    const { data } = await db
      .from('admission_boards')
      .select('id, code, name, short_name')
      .eq('country_id', countryId)
      .eq('is_active', true)
      .order('sort_order');
    setBoards(data || []);
  }, []);

  const loadPrograms = useCallback(async (boardId: string) => {
    const { data } = await db
      .from('admission_programs')
      .select('id, code, name')
      .eq('board_id', boardId)
      .eq('is_active', true)
      .order('sort_order');
    setPrograms(data || []);
  }, []);

  return { countries, boards, programs, loading, loadBoards, loadPrograms };
}

/** Institutions offering a program, ranked on real data. */
export function useInstitutionDiscovery() {
  const [items, setItems] = useState<DiscoveredInstitution[]>([]);
  const [loading, setLoading] = useState(false);

  const discover = useCallback(async (programId: string, year?: number) => {
    setLoading(true);
    const { data } = await db.rpc('discover_institutions', {
      _program_id: programId,
      _year: year ?? null,
    });
    setItems((data || []) as DiscoveredInstitution[]);
    setLoading(false);
  }, []);

  return { items, loading, discover };
}

export function useProgramRequirements(institutionProgramId: string | null) {
  const [requirements, setRequirements] = useState<ProgramRequirement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!institutionProgramId) { setRequirements([]); return; }
    (async () => {
      setLoading(true);
      const { data } = await db.rpc('list_program_requirements', {
        _institution_program_id: institutionProgramId,
      });
      setRequirements((data || []) as ProgramRequirement[]);
      setLoading(false);
    })();
  }, [institutionProgramId]);

  return { requirements, loading };
}

/** Badges derived only from real ranking data. */
export function institutionBadges(item: DiscoveredInstitution, rank: number): string[] {
  if (!item.has_data) return ['Insufficient Data'];
  const badges: string[] = ['Verified Data'];
  if (rank === 1) badges.unshift('#1 Ranked');
  else if (rank <= 3) badges.unshift('Top Performing');
  if ((item.pass_rate ?? 0) >= 85) badges.push('High Pass Rate');
  if ((item.attendance_rate ?? 0) >= 90) badges.push('High Attendance');
  if ((item.admission_success_rate ?? 0) >= 70) badges.push('Strong Admission Success');
  return badges;
}
