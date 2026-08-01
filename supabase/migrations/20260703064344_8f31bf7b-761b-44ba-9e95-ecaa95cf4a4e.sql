-- ============ EXTENSIONS ============
create extension if not exists vector;

-- ============ ENUMS ============
create type public.app_role as enum ('admin','curador','professor','estudante');
create type public.content_status as enum ('draft','submitted','in_review','approved','published');

-- ============ SHARED HELPERS ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  avatar_url text,
  institution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles viewable by everyone" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.update_updated_at_column();

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_reviewer(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','curador'));
$$;

create policy "View own roles or reviewer" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.is_reviewer(auth.uid()));
create policy "Admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Self-service bootstrap: create profile + assign 'estudante' only (no self-promotion)
create or replace function public.initialize_current_user(_display_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  insert into public.profiles (id, display_name)
  values (uid, _display_name)
  on conflict (id) do update set display_name = coalesce(excluded.display_name, public.profiles.display_name);
  insert into public.user_roles (user_id, role) values (uid, 'estudante') on conflict do nothing;
end; $$;
grant execute on function public.initialize_current_user(text) to authenticated;

-- ============ ENTITIES (curated collection) ============
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  title text not null,
  slug text unique,
  subtitle text,
  description text,
  date_start integer,
  date_end integer,
  date_display text,
  location text,
  country text,
  continent text,
  culture text,
  image_url text,
  image_license text,
  open_image boolean not null default false,
  source_url text,
  tags text[] not null default '{}',
  themes text[] not null default '{}',
  colors text[] not null default '{}',
  materials text[] not null default '{}',
  techniques text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  status content_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_entities_type on public.entities(entity_type);
create index idx_entities_status on public.entities(status);
create index idx_entities_country on public.entities(country);
create index idx_entities_tags on public.entities using gin(tags);
create index idx_entities_themes on public.entities using gin(themes);
grant select on public.entities to anon, authenticated;
grant insert, update, delete on public.entities to authenticated;
grant all on public.entities to service_role;
alter table public.entities enable row level security;
create policy "View published entities" on public.entities for select using (status = 'published' or auth.uid() = created_by or public.is_reviewer(auth.uid()));
create policy "Create entities" on public.entities for insert to authenticated with check (auth.uid() = created_by);
create policy "Update own or reviewer entities" on public.entities for update to authenticated using (auth.uid() = created_by or public.is_reviewer(auth.uid())) with check (auth.uid() = created_by or public.is_reviewer(auth.uid()));
create policy "Delete own or reviewer entities" on public.entities for delete to authenticated using (auth.uid() = created_by or public.is_reviewer(auth.uid()));
create trigger trg_entities_updated before update on public.entities for each row execute function public.update_updated_at_column();

-- ============ MOTIFS ============
create table public.motifs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  image_url text,
  status content_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.motifs to anon, authenticated;
grant insert, update, delete on public.motifs to authenticated;
grant all on public.motifs to service_role;
alter table public.motifs enable row level security;
create policy "View published motifs" on public.motifs for select using (status = 'published' or auth.uid() = created_by or public.is_reviewer(auth.uid()));
create policy "Create motifs" on public.motifs for insert to authenticated with check (auth.uid() = created_by);
create policy "Update own or reviewer motifs" on public.motifs for update to authenticated using (auth.uid() = created_by or public.is_reviewer(auth.uid())) with check (auth.uid() = created_by or public.is_reviewer(auth.uid()));
create policy "Delete own or reviewer motifs" on public.motifs for delete to authenticated using (auth.uid() = created_by or public.is_reviewer(auth.uid()));
create trigger trg_motifs_updated before update on public.motifs for each row execute function public.update_updated_at_column();

-- ============ RELATIONS ============
create table public.relations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.entities(id) on delete cascade,
  target_id uuid not null references public.entities(id) on delete cascade,
  relation_type text not null,
  description text,
  author text,
  confidence numeric,
  status content_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_relations_source on public.relations(source_id);
create index idx_relations_target on public.relations(target_id);
grant select on public.relations to anon, authenticated;
grant insert, update, delete on public.relations to authenticated;
grant all on public.relations to service_role;
alter table public.relations enable row level security;
create policy "View published relations" on public.relations for select using (status = 'published' or auth.uid() = created_by or public.is_reviewer(auth.uid()));
create policy "Create relations" on public.relations for insert to authenticated with check (auth.uid() = created_by);
create policy "Update own or reviewer relations" on public.relations for update to authenticated using (auth.uid() = created_by or public.is_reviewer(auth.uid())) with check (auth.uid() = created_by or public.is_reviewer(auth.uid()));
create policy "Delete own or reviewer relations" on public.relations for delete to authenticated using (auth.uid() = created_by or public.is_reviewer(auth.uid()));
create trigger trg_relations_updated before update on public.relations for each row execute function public.update_updated_at_column();

-- ============ BIBLIOGRAPHY ============
create table public.bibliography (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text,
  year integer,
  ref_type text,
  doi text,
  isbn text,
  url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.bibliography to anon, authenticated;
grant insert, update, delete on public.bibliography to authenticated;
grant all on public.bibliography to service_role;
alter table public.bibliography enable row level security;
create policy "Bibliography viewable by everyone" on public.bibliography for select using (true);
create policy "Create bibliography" on public.bibliography for insert to authenticated with check (auth.uid() = created_by);
create policy "Update own or reviewer bibliography" on public.bibliography for update to authenticated using (auth.uid() = created_by or public.is_reviewer(auth.uid())) with check (auth.uid() = created_by or public.is_reviewer(auth.uid()));
create policy "Delete own or reviewer bibliography" on public.bibliography for delete to authenticated using (auth.uid() = created_by or public.is_reviewer(auth.uid()));
create trigger trg_bibliography_updated before update on public.bibliography for each row execute function public.update_updated_at_column();

-- ============ JUNCTIONS ============
create table public.entity_motifs (
  entity_id uuid not null references public.entities(id) on delete cascade,
  motif_id uuid not null references public.motifs(id) on delete cascade,
  primary key (entity_id, motif_id)
);
grant select on public.entity_motifs to anon, authenticated;
grant insert, delete on public.entity_motifs to authenticated;
grant all on public.entity_motifs to service_role;
alter table public.entity_motifs enable row level security;
create policy "View entity_motifs" on public.entity_motifs for select using (true);
create policy "Manage entity_motifs" on public.entity_motifs for all to authenticated using (public.is_reviewer(auth.uid()) or exists(select 1 from public.entities e where e.id = entity_id and e.created_by = auth.uid())) with check (public.is_reviewer(auth.uid()) or exists(select 1 from public.entities e where e.id = entity_id and e.created_by = auth.uid()));

create table public.entity_bibliography (
  entity_id uuid not null references public.entities(id) on delete cascade,
  bibliography_id uuid not null references public.bibliography(id) on delete cascade,
  primary key (entity_id, bibliography_id)
);
grant select on public.entity_bibliography to anon, authenticated;
grant insert, delete on public.entity_bibliography to authenticated;
grant all on public.entity_bibliography to service_role;
alter table public.entity_bibliography enable row level security;
create policy "View entity_bibliography" on public.entity_bibliography for select using (true);
create policy "Manage entity_bibliography" on public.entity_bibliography for all to authenticated using (public.is_reviewer(auth.uid()) or exists(select 1 from public.entities e where e.id = entity_id and e.created_by = auth.uid())) with check (public.is_reviewer(auth.uid()) or exists(select 1 from public.entities e where e.id = entity_id and e.created_by = auth.uid()));

create table public.relation_bibliography (
  relation_id uuid not null references public.relations(id) on delete cascade,
  bibliography_id uuid not null references public.bibliography(id) on delete cascade,
  primary key (relation_id, bibliography_id)
);
grant select on public.relation_bibliography to anon, authenticated;
grant insert, delete on public.relation_bibliography to authenticated;
grant all on public.relation_bibliography to service_role;
alter table public.relation_bibliography enable row level security;
create policy "View relation_bibliography" on public.relation_bibliography for select using (true);
create policy "Manage relation_bibliography" on public.relation_bibliography for all to authenticated using (public.is_reviewer(auth.uid()) or exists(select 1 from public.relations r where r.id = relation_id and r.created_by = auth.uid())) with check (public.is_reviewer(auth.uid()) or exists(select 1 from public.relations r where r.id = relation_id and r.created_by = auth.uid()));

-- ============ ATLASES ============
create table public.atlases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Novo Atlas',
  description text,
  cover_url text,
  status content_status not null default 'draft',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_atlases_owner on public.atlases(owner_id);
grant select on public.atlases to anon, authenticated;
grant insert, update, delete on public.atlases to authenticated;
grant all on public.atlases to service_role;
alter table public.atlases enable row level security;
create policy "View atlases" on public.atlases for select using (auth.uid() = owner_id or status = 'published' or is_public or public.is_reviewer(auth.uid()));
create policy "Create own atlas" on public.atlases for insert to authenticated with check (auth.uid() = owner_id);
create policy "Update own or reviewer atlas" on public.atlases for update to authenticated using (auth.uid() = owner_id or public.is_reviewer(auth.uid())) with check (auth.uid() = owner_id or public.is_reviewer(auth.uid()));
create policy "Delete own or reviewer atlas" on public.atlases for delete to authenticated using (auth.uid() = owner_id or public.is_reviewer(auth.uid()));
create trigger trg_atlases_updated before update on public.atlases for each row execute function public.update_updated_at_column();

create or replace function public.can_edit_atlas(_atlas_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.atlases a where a.id = _atlas_id and (a.owner_id = auth.uid() or public.is_reviewer(auth.uid())));
$$;
create or replace function public.can_view_atlas(_atlas_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.atlases a where a.id = _atlas_id and (a.owner_id = auth.uid() or a.status = 'published' or a.is_public or public.is_reviewer(auth.uid())));
$$;

-- ============ ATLAS GROUPS ============
create table public.atlas_groups (
  id uuid primary key default gen_random_uuid(),
  atlas_id uuid not null references public.atlases(id) on delete cascade,
  title text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.atlas_groups to anon, authenticated;
grant insert, update, delete on public.atlas_groups to authenticated;
grant all on public.atlas_groups to service_role;
alter table public.atlas_groups enable row level security;
create policy "View atlas groups" on public.atlas_groups for select using (public.can_view_atlas(atlas_id));
create policy "Manage atlas groups" on public.atlas_groups for all to authenticated using (public.can_edit_atlas(atlas_id)) with check (public.can_edit_atlas(atlas_id));

-- ============ ATLAS CARDS ============
create table public.atlas_cards (
  id uuid primary key default gen_random_uuid(),
  atlas_id uuid not null references public.atlases(id) on delete cascade,
  card_type text not null,
  entity_id uuid references public.entities(id) on delete set null,
  group_id uuid references public.atlas_groups(id) on delete set null,
  title text,
  body text,
  media_url text,
  link_url text,
  x double precision not null default 0,
  y double precision not null default 0,
  width double precision not null default 240,
  height double precision not null default 300,
  rotation double precision not null default 0,
  z_index integer not null default 0,
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_atlas_cards_atlas on public.atlas_cards(atlas_id);
grant select on public.atlas_cards to anon, authenticated;
grant insert, update, delete on public.atlas_cards to authenticated;
grant all on public.atlas_cards to service_role;
alter table public.atlas_cards enable row level security;
create policy "View atlas cards" on public.atlas_cards for select using (public.can_view_atlas(atlas_id));
create policy "Manage atlas cards" on public.atlas_cards for all to authenticated using (public.can_edit_atlas(atlas_id)) with check (public.can_edit_atlas(atlas_id));
create trigger trg_atlas_cards_updated before update on public.atlas_cards for each row execute function public.update_updated_at_column();

-- ============ ATLAS CONNECTIONS ============
create table public.atlas_connections (
  id uuid primary key default gen_random_uuid(),
  atlas_id uuid not null references public.atlases(id) on delete cascade,
  source_card_id uuid not null references public.atlas_cards(id) on delete cascade,
  target_card_id uuid not null references public.atlas_cards(id) on delete cascade,
  relation_type text,
  argument text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_atlas_connections_atlas on public.atlas_connections(atlas_id);
grant select on public.atlas_connections to anon, authenticated;
grant insert, update, delete on public.atlas_connections to authenticated;
grant all on public.atlas_connections to service_role;
alter table public.atlas_connections enable row level security;
create policy "View atlas connections" on public.atlas_connections for select using (public.can_view_atlas(atlas_id));
create policy "Manage atlas connections" on public.atlas_connections for all to authenticated using (public.can_edit_atlas(atlas_id)) with check (public.can_edit_atlas(atlas_id));
create trigger trg_atlas_connections_updated before update on public.atlas_connections for each row execute function public.update_updated_at_column();

-- ============ CURATION REVIEWS ============
create table public.curation_reviews (
  id uuid primary key default gen_random_uuid(),
  atlas_id uuid references public.atlases(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  from_status content_status,
  to_status content_status not null,
  comment text,
  created_at timestamptz not null default now()
);
grant select on public.curation_reviews to authenticated;
grant insert on public.curation_reviews to authenticated;
grant all on public.curation_reviews to service_role;
alter table public.curation_reviews enable row level security;
create policy "View reviews (owner or reviewer)" on public.curation_reviews for select to authenticated using (public.is_reviewer(auth.uid()) or exists(select 1 from public.atlases a where a.id = atlas_id and a.owner_id = auth.uid()));
create policy "Reviewers create reviews" on public.curation_reviews for insert to authenticated with check (public.is_reviewer(auth.uid()));

-- ============ CLASSES (turmas) + ENROLLMENTS + ACTIVITIES ============
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.classes to authenticated;
grant insert, update, delete on public.classes to authenticated;
grant all on public.classes to service_role;
alter table public.classes enable row level security;

create table public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);
grant select on public.class_enrollments to authenticated;
grant insert, delete on public.class_enrollments to authenticated;
grant all on public.class_enrollments to service_role;
alter table public.class_enrollments enable row level security;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  prompt text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.activities to authenticated;
grant insert, update, delete on public.activities to authenticated;
grant all on public.activities to service_role;
alter table public.activities enable row level security;

-- Helpers (now that both classes and class_enrollments exist)
create or replace function public.owns_class(_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = _class_id and (c.professor_id = auth.uid() or public.is_reviewer(auth.uid())));
$$;
create or replace function public.is_enrolled(_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.class_enrollments e where e.class_id = _class_id and e.student_id = auth.uid());
$$;

-- Classes policies
create policy "View classes" on public.classes for select to authenticated using (professor_id = auth.uid() or public.is_reviewer(auth.uid()) or public.is_enrolled(id));
create policy "Professors create classes" on public.classes for insert to authenticated with check (professor_id = auth.uid() and (public.has_role(auth.uid(),'professor') or public.is_reviewer(auth.uid())));
create policy "Professors update own classes" on public.classes for update to authenticated using (public.owns_class(id)) with check (public.owns_class(id));
create policy "Professors delete own classes" on public.classes for delete to authenticated using (public.owns_class(id));
create trigger trg_classes_updated before update on public.classes for each row execute function public.update_updated_at_column();

-- Enrollment policies
create policy "View enrollments" on public.class_enrollments for select to authenticated using (student_id = auth.uid() or public.owns_class(class_id));
create policy "Enroll (self or professor)" on public.class_enrollments for insert to authenticated with check (student_id = auth.uid() or public.owns_class(class_id));
create policy "Unenroll (self or professor)" on public.class_enrollments for delete to authenticated using (student_id = auth.uid() or public.owns_class(class_id));

-- Activities policies
create policy "View activities" on public.activities for select to authenticated using (public.owns_class(class_id) or public.is_enrolled(class_id));
create policy "Manage activities" on public.activities for all to authenticated using (public.owns_class(class_id)) with check (public.owns_class(class_id));
create trigger trg_activities_updated before update on public.activities for each row execute function public.update_updated_at_column();