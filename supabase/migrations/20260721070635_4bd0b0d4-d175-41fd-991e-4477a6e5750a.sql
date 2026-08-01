create type public.ai_target_type as enum ('entity', 'atlas');
create type public.ai_proposal_status as enum ('pending', 'accepted', 'rejected', 'edited');
create type public.ai_decision_action as enum ('accept', 'reject', 'edit');

create table public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type public.ai_target_type not null,
  target_id uuid not null,
  proposal_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.ai_proposal_status not null default 'pending',
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.ai_proposals to authenticated;
grant all on public.ai_proposals to service_role;
alter table public.ai_proposals enable row level security;

create policy "View own proposals or reviewer" on public.ai_proposals for select to authenticated using (auth.uid() = user_id or public.is_reviewer(auth.uid()));
create policy "Create own proposals" on public.ai_proposals for insert to authenticated with check (auth.uid() = user_id);
create policy "Update own proposals or reviewer" on public.ai_proposals for update to authenticated using (auth.uid() = user_id or public.is_reviewer(auth.uid())) with check (auth.uid() = user_id or public.is_reviewer(auth.uid()));
create policy "Delete own proposals or reviewer" on public.ai_proposals for delete to authenticated using (auth.uid() = user_id or public.is_reviewer(auth.uid()));

create trigger trg_ai_proposals_updated before update on public.ai_proposals for each row execute function public.update_updated_at_column();

create table public.ai_decisions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.ai_proposals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action public.ai_decision_action not null,
  diff jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

grant select, insert on public.ai_decisions to authenticated;
grant all on public.ai_decisions to service_role;
alter table public.ai_decisions enable row level security;

create policy "View decisions of own proposals or reviewer" on public.ai_decisions for select to authenticated using (public.is_reviewer(auth.uid()) or exists(select 1 from public.ai_proposals p where p.id = proposal_id and p.user_id = auth.uid()));
create policy "Create decisions on own proposals or reviewer" on public.ai_decisions for insert to authenticated with check (public.is_reviewer(auth.uid()) or exists(select 1 from public.ai_proposals p where p.id = proposal_id and p.user_id = auth.uid()));

create index idx_ai_proposals_user on public.ai_proposals(user_id);
create index idx_ai_proposals_target on public.ai_proposals(target_type, target_id);
create index idx_ai_decisions_proposal on public.ai_decisions(proposal_id);