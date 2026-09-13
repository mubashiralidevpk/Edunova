import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SchoolSettings {
  id: string;
  school_name: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  checkin_deadline: string;
}

export function useSchoolSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      let schoolId: string | null = null;
      if (uid) {
        const { data: prof } = await supabase.from('profiles').select('school_id').eq('user_id', uid).maybeSingle();
        schoolId = prof?.school_id ?? null;
      }
      const query = supabase.from('school_settings').select('*').limit(1);
      const { data, error } = schoolId
        ? await query.eq('school_id', schoolId).maybeSingle()
        : await query.maybeSingle();

      if (error) throw error;
      setSettings(data as SchoolSettings);
    } catch (error) {
      console.error('Error fetching school settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<SchoolSettings>) => {
    if (!settings) return false;

    try {
      const { error } = await supabase
        .from('school_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast({ title: "Settings updated successfully" });
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({ 
        title: "Failed to update settings", 
        variant: "destructive" 
      });
      return false;
    }
  };

  const isWithinGeofence = (lat: number, lng: number): boolean => {
    if (!settings?.latitude || !settings?.longitude) return true; // No geofence set

    const R = 6371e3; // Earth's radius in meters
    const φ1 = settings.latitude * Math.PI / 180;
    const φ2 = lat * Math.PI / 180;
    const Δφ = (lat - settings.latitude) * Math.PI / 180;
    const Δλ = (lng - settings.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance <= settings.geofence_radius_meters;
  };

  return {
    settings,
    loading,
    updateSettings,
    isWithinGeofence,
    refetch: fetchSettings,
  };
}
