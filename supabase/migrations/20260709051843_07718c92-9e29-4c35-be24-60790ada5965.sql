-- 1. GRANTs faltantes em todas as tabelas públicas
-- Conteúdo curado público: leitura anônima + gestão autenticada
GRANT SELECT ON public.entities, public.relations, public.motifs, public.bibliography,
  public.entity_motifs, public.entity_bibliography, public.relation_bibliography TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.activities, public.atlas_cards, public.atlas_connections, public.atlas_groups,
  public.atlases, public.bibliography, public.class_enrollments, public.classes,
  public.curation_reviews, public.entities, public.entity_bibliography, public.entity_motifs,
  public.motifs, public.profiles, public.relation_bibliography, public.relations,
  public.user_roles TO authenticated;

GRANT ALL ON
  public.activities, public.atlas_cards, public.atlas_connections, public.atlas_groups,
  public.atlases, public.bibliography, public.class_enrollments, public.classes,
  public.curation_reviews, public.entities, public.entity_bibliography, public.entity_motifs,
  public.motifs, public.profiles, public.relation_bibliography, public.relations,
  public.user_roles TO service_role;

-- 2. Dados de exemplo do acervo (domínio público)
WITH seed(entity_type, title, subtitle, description, date_start, date_display, location, country, continent, culture, image_url, tags, themes, colors, materials, techniques) AS (
  VALUES
  ('obra','O Nascimento de Vênus','Sandro Botticelli','Têmpera sobre tela retratando o mito do nascimento de Vênus, ícone do Renascimento florentino.',1485,'c. 1485','Florença','Itália','Europa','Renascimento','https://commons.wikimedia.org/wiki/Special:FilePath/Sandro Botticelli - La nascita di Venere - Google Art Project - edited.jpg?width=900', ARRAY['renascimento','mitologia'], ARRAY['nascimento','beleza'], ARRAY['#d9c7a3','#7fa9a5'], ARRAY['têmpera'], ARRAY['pintura']),
  ('obra','A Grande Onda de Kanagawa','Katsushika Hokusai','Xilogravura ukiyo-e da série Trinta e Seis Vistas do Monte Fuji.',1831,'c. 1831','Edo','Japão','Ásia','Edo','https://commons.wikimedia.org/wiki/Special:FilePath/Tsunami by hokusai 19th century.jpg?width=900', ARRAY['ukiyo-e','mar'], ARRAY['onda','natureza'], ARRAY['#1b3a5b','#e8e2d0'], ARRAY['tinta'], ARRAY['xilogravura']),
  ('obra','A Noite Estrelada','Vincent van Gogh','Óleo sobre tela do céu noturno turbulento visto de Saint-Rémy-de-Provence.',1889,'1889','Saint-Rémy','França','Europa','Pós-impressionismo','https://commons.wikimedia.org/wiki/Special:FilePath/Van Gogh - Starry Night - Google Art Project.jpg?width=900', ARRAY['pós-impressionismo','céu'], ARRAY['noite','cosmos'], ARRAY['#1c3d6e','#e6c94a'], ARRAY['óleo'], ARRAY['pintura']),
  ('obra','O Grito','Edvard Munch','Ícone do expressionismo, expressão da angústia existencial moderna.',1893,'1893','Oslo','Noruega','Europa','Expressionismo','https://commons.wikimedia.org/wiki/Special:FilePath/Edvard Munch, 1893, The Scream, oil, tempera and pastel on cardboard, 91 x 73 cm, National Gallery of Norway.jpg?width=900', ARRAY['expressionismo','angústia'], ARRAY['grito','medo'], ARRAY['#d97b29','#3a2b6e'], ARRAY['têmpera','pastel'], ARRAY['pintura']),
  ('obra','Moça com Brinco de Pérola','Johannes Vermeer','Tronie do Século de Ouro holandês, célebre pelo uso da luz.',1665,'c. 1665','Delft','Países Baixos','Europa','Barroco','https://commons.wikimedia.org/wiki/Special:FilePath/1665 Girl with a Pearl Earring.jpg?width=900', ARRAY['barroco','retrato'], ARRAY['luz','olhar'], ARRAY['#1a1712','#d8c08a'], ARRAY['óleo'], ARRAY['pintura']),
  ('obra','O Beijo','Gustav Klimt','Obra-prima do período dourado da Secessão vienense.',1908,'1907–1908','Viena','Áustria','Europa','Art Nouveau','https://commons.wikimedia.org/wiki/Special:FilePath/The Kiss - Gustav Klimt - Google Cultural Institute.jpg?width=900', ARRAY['art nouveau','ouro'], ARRAY['amor','abraço'], ARRAY['#c9a227','#8a6d3b'], ARRAY['óleo','ouro'], ARRAY['pintura']),
  ('artista','Katsushika Hokusai','1760–1849','Mestre japonês do ukiyo-e, autor de A Grande Onda de Kanagawa.',1760,'1760–1849','Edo','Japão','Ásia','Edo',NULL, ARRAY['ukiyo-e'], ARRAY['paisagem'], ARRAY[]::text[], ARRAY[]::text[], ARRAY['xilogravura']),
  ('artista','Vincent van Gogh','1853–1890','Pintor pós-impressionista neerlandês de enorme influência na arte moderna.',1853,'1853–1890','Zundert','Países Baixos','Europa','Pós-impressionismo',NULL, ARRAY['pós-impressionismo'], ARRAY['cor','emoção'], ARRAY[]::text[], ARRAY[]::text[], ARRAY['pintura']),
  ('movimento','Ukiyo-e','Arte japonesa','Gênero de xilogravuras e pinturas florescente entre os séculos XVII e XIX.',1600,'séc. XVII–XIX','Japão','Japão','Ásia','Edo',NULL, ARRAY['gravura'], ARRAY['cotidiano','paisagem'], ARRAY[]::text[], ARRAY[]::text[], ARRAY['xilogravura']),
  ('movimento','Expressionismo','Vanguarda europeia','Movimento que privilegia a expressão subjetiva e emocional sobre a representação realista.',1905,'séc. XX','Alemanha','Alemanha','Europa','Modernismo',NULL, ARRAY['vanguarda'], ARRAY['angústia','subjetividade'], ARRAY[]::text[], ARRAY[]::text[], ARRAY['pintura']),
  ('conceito','Nachleben (Sobrevivência das imagens)','Aby Warburg','Conceito que descreve a persistência e o retorno de fórmulas visuais através do tempo.',1920,'séc. XX','Hamburgo','Alemanha','Europa','Teoria da imagem',NULL, ARRAY['warburg','memória'], ARRAY['sobrevivência','tempo'], ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::text[]),
  ('motivo','A onda','Fórmula de pathos','Motivo visual recorrente da força da água em movimento em diversas culturas.',NULL,NULL,NULL,NULL,'Planetário',NULL,NULL, ARRAY['pathosformel'], ARRAY['água','movimento'], ARRAY['#1b3a5b'], ARRAY[]::text[], ARRAY[]::text[])
)
INSERT INTO public.entities (entity_type, title, subtitle, description, date_start, date_display, location, country, continent, culture, image_url, open_image, image_license, status, tags, themes, colors, materials, techniques)
SELECT entity_type, title, subtitle, description, date_start, date_display, location, country, continent, culture, image_url, image_url IS NOT NULL, 'Domínio público', 'published'::content_status, tags, themes, colors, materials, techniques
FROM seed;

-- 3. Relações de exemplo entre entidades
INSERT INTO public.relations (source_id, target_id, relation_type, description, author, confidence, status)
SELECT s.id, t.id, r.rtype, r.descr, 'Editorial', 0.8, 'published'::content_status
FROM (VALUES
  ('A Grande Onda de Kanagawa','Ukiyo-e','continuidade','A obra é expressão máxima do gênero ukiyo-e.'),
  ('A Grande Onda de Kanagawa','A onda','sobrevivencia','O motivo da onda sobrevive e retorna nesta xilogravura.'),
  ('Ukiyo-e','A Noite Estrelada','influencia','As gravuras japonesas influenciaram profundamente os pós-impressionistas.'),
  ('O Grito','Expressionismo','continuidade','Precursora e ícone da sensibilidade expressionista.'),
  ('Katsushika Hokusai','A Grande Onda de Kanagawa','influencia','Autoria direta da obra.')
) AS r(src, tgt, rtype, descr)
JOIN public.entities s ON s.title = r.src
JOIN public.entities t ON t.title = r.tgt;