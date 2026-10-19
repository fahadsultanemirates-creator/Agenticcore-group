-- Applied through Supabase migration tools; exact version recorded in workspace-setup.md.
begin;
create function public.provision_office(p_user_id uuid,p_name text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare office_id uuid;
begin
 if p_user_id is null or p_name is null or length(trim(p_name)) not between 1 and 120 then raise exception 'Invalid business details'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select organization_id into office_id from public.office_memberships where user_id=p_user_id and role='owner' order by created_at limit 1;
 if office_id is not null then return office_id; end if;
 insert into public.office_organizations(name) values (trim(p_name)) returning id into office_id;
 insert into public.office_memberships(organization_id,user_id,role) values (office_id,p_user_id,'owner');
 return office_id;
end $$;
revoke all on function public.provision_office(uuid,text) from public,anon,authenticated;
grant execute on function public.provision_office(uuid,text) to service_role;

create table public.office_projects (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.office_organizations(id),
 title text not null check(length(trim(title)) between 1 and 180),
 description text not null default '',
 department text not null default 'Coordination',
 status text not null default 'planned' check(status in ('planned','in_progress','awaiting_approval','blocked','completed')),
 due_on date,
 created_at timestamptz not null default now(),
 unique(id,organization_id)
);
create index office_projects_org_idx on public.office_projects(organization_id,created_at desc);
create table public.office_milestones (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 organization_id uuid not null,
 title text not null,
 status text not null default 'planned' check(status in ('planned','in_progress','completed')),
 due_on date,
 position integer not null default 0,
 foreign key(project_id,organization_id) references public.office_projects(id,organization_id) on delete cascade
);
create index office_milestones_project_idx on public.office_milestones(project_id,organization_id);
create index office_milestones_org_idx on public.office_milestones(organization_id);
create table public.office_deliverables (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 organization_id uuid not null,
 label text not null,
 url text not null check(url ~ '^https://'),
 notes text not null default '',
 created_at timestamptz not null default now(),
 foreign key(project_id,organization_id) references public.office_projects(id,organization_id) on delete cascade
);
create index office_deliverables_project_idx on public.office_deliverables(project_id,organization_id);
create index office_deliverables_org_idx on public.office_deliverables(organization_id);
create table public.office_updates (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.office_organizations(id),
 title text not null,
 body text not null default '',
 created_at timestamptz not null default now()
);
create index office_updates_org_idx on public.office_updates(organization_id,created_at desc);
alter table public.office_projects enable row level security;
alter table public.office_milestones enable row level security;
alter table public.office_deliverables enable row level security;
alter table public.office_updates enable row level security;
revoke all on public.office_projects,public.office_milestones,public.office_deliverables,public.office_updates from public,anon,authenticated;
grant select on public.office_projects,public.office_milestones,public.office_deliverables,public.office_updates to authenticated;
grant all on public.office_projects,public.office_milestones,public.office_deliverables,public.office_updates to service_role;
create policy office_projects_read on public.office_projects for select to authenticated using(exists(select 1 from public.office_memberships m where m.organization_id=office_projects.organization_id and m.user_id=(select auth.uid())));
create policy office_milestones_read on public.office_milestones for select to authenticated using(exists(select 1 from public.office_memberships m where m.organization_id=office_milestones.organization_id and m.user_id=(select auth.uid())));
create policy office_deliverables_read on public.office_deliverables for select to authenticated using(exists(select 1 from public.office_memberships m where m.organization_id=office_deliverables.organization_id and m.user_id=(select auth.uid())));
create policy office_updates_read on public.office_updates for select to authenticated using(exists(select 1 from public.office_memberships m where m.organization_id=office_updates.organization_id and m.user_id=(select auth.uid())));
commit;
