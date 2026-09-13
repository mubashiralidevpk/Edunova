import { supabase } from '@/integrations/supabase/client';

export interface HomeworkFile {
  path: string;
  name: string;
  type: string;
  size: number;
}

const BUCKET = 'homework-files';

export async function uploadHomeworkFiles(files: File[], folder: string): Promise<HomeworkFile[]> {
  const uploaded: HomeworkFile[] = [];
  for (const file of files) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
    uploaded.push({ path, name: file.name, type: file.type, size: file.size });
  }
  return uploaded;
}

export async function homeworkFileUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function openHomeworkFile(path: string) {
  const url = await homeworkFileUrl(path);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
