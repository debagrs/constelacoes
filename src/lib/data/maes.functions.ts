/** Dossiê "Artistas mães": mulheres artistas e a maternidade como condição e matéria de obra. */
import { createServerFn } from "@tanstack/react-start";

export const FACET_MAES = "sensibilidade:artistas-maes";

export type ArtistaMae = {
  id: string;
  title: string;
  subtitle: string | null;
  date_display: string | null;
  date_start: number | null;
  country: string | null;
  continent: string | null;
  culture: string | null;
  image_url: string | null;
  region_id: string | null;
  filhos: string | null;
  nota: string | null;
};

export const listArtistasMaes = createServerFn({ method: "GET" }).handler(async () => {
  const { query } = await import("@/lib/turso/client.server");
  return await query<ArtistaMae>(
    `SELECT e.id, e.title, e.subtitle, e.date_display, e.date_start, e.country, e.continent,
            e.culture, e.image_url, e.region_id,
            json_extract(e.metadata, '$.maternidade.filhos') AS filhos,
            json_extract(e.metadata, '$.maternidade.nota')   AS nota
       FROM entities e
       JOIN entity_facets ef ON ef.entity_id = e.id AND ef.facet_id = ?
      WHERE e.status = 'published'
      ORDER BY e.date_start ASC, e.title COLLATE NOCASE ASC`,
    [FACET_MAES],
  );
});
