ALTER TABLE public.school_settings
  ADD COLUMN IF NOT EXISTS country_id uuid REFERENCES public.admission_countries(id),
  ADD COLUMN IF NOT EXISTS board_id uuid REFERENCES public.admission_boards(id);