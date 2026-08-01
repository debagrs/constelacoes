
CREATE TABLE public.image_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  rank smallint NOT NULL DEFAULT 1,
  image_url text NOT NULL,
  thumbnail_url text,
  source_url text,
  wikidata_qid text,
  candidate_title text,
  candidate_description text,
  license text,
  score real,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT image_suggestions_status_check CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX image_suggestions_entity_idx ON public.image_suggestions(entity_id, rank);
CREATE INDEX image_suggestions_status_idx ON public.image_suggestions(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_suggestions TO authenticated;
GRANT ALL ON public.image_suggestions TO service_role;

ALTER TABLE public.image_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers can view image suggestions"
  ON public.image_suggestions FOR SELECT
  TO authenticated
  USING (public.is_reviewer(auth.uid()));

CREATE POLICY "Reviewers can insert image suggestions"
  ON public.image_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_reviewer(auth.uid()));

CREATE POLICY "Reviewers can update image suggestions"
  ON public.image_suggestions FOR UPDATE
  TO authenticated
  USING (public.is_reviewer(auth.uid()))
  WITH CHECK (public.is_reviewer(auth.uid()));

CREATE POLICY "Reviewers can delete image suggestions"
  ON public.image_suggestions FOR DELETE
  TO authenticated
  USING (public.is_reviewer(auth.uid()));

CREATE TRIGGER update_image_suggestions_updated_at
  BEFORE UPDATE ON public.image_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approve helper: promotes suggestion to entity image and rejects siblings.
CREATE OR REPLACE FUNCTION public.approve_image_suggestion(_suggestion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.image_suggestions%ROWTYPE;
BEGIN
  IF NOT public.is_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO s FROM public.image_suggestions WHERE id = _suggestion_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Suggestion not found'; END IF;

  UPDATE public.entities
     SET image_url = s.image_url,
         source_url = COALESCE(s.source_url, source_url),
         image_license = COALESCE(s.license, image_license, 'Domínio público'),
         open_image = true,
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'imagem_fonte', COALESCE(s.source_url, ''),
           'wikidata_qid', COALESCE(s.wikidata_qid, ''),
           'licenca_texto', COALESCE(s.license, 'Domínio público'),
           'status_metadados', 'completo',
           'aprovado_por', auth.uid()::text,
           'aprovado_em', now()::text
         ),
         updated_at = now()
   WHERE id = s.entity_id;

  UPDATE public.image_suggestions
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _suggestion_id;

  UPDATE public.image_suggestions
     SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE entity_id = s.entity_id AND id <> _suggestion_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_image_suggestion(_suggestion_id uuid, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_reviewer(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.image_suggestions
     SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
         notes = COALESCE(_notes, notes)
   WHERE id = _suggestion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_image_suggestion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_image_suggestion(uuid, text) TO authenticated;
