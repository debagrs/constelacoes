ALTER TABLE public.entities REPLICA IDENTITY FULL;
ALTER TABLE public.atlas_cards REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atlas_cards;