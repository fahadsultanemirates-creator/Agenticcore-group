-- Review proposal only. Not an applied migration.
-- Target a NEW dedicated office-core project after organization selection.
begin;
create table public.office_organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 120),
 created_at timestamptz not null default now()
);
create table public.office_memberships (
 organization_id uuid not null references public.office_organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','admin','member','viewer')),
 created_at timestamptz not null default now(),
 primary key (organization_id,user_id)
);
create index office_memberships_user_idx on public.office_memberships(user_id,organization_id);
create table public.office_requests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.office_organizations(id),
 created_by uuid not null default auth.uid() references auth.users(id),
 source_site text not null default 'group' check (source_site in ('group','agency','biz')),
 route text not null check (route in ('managed','owned')),
 brief jsonb not null check (jsonb_typeof(brief) = 'object' and octet_length(brief::text) <= 65536),
 status text not null default 'submitted' check (status in ('submitted','reviewing','needs_information','scoped','closed')),
 created_at timestamptz not null default now()
);
create index office_requests_org_date_idx on public.office_requests(organization_id,created_at desc);

alter table public.office_organizations enable row level security;
alter table public.office_memberships enable row level security;
alter table public.office_requests enable row level security;

revoke all on public.office_organizations, public.office_memberships, public.office_requests from public, anon, authenticated;
grant select on public.office_organizations, public.office_memberships, public.office_requests to authenticated;
-- Client submissions are immutable snapshots. Status, source and author are not client-settable.
grant insert (organization_id,route,brief) on public.office_requests to authenticated;
grant all on public.office_organizations, public.office_memberships, public.office_requests to service_role;

-- Membership lookup is non-recursive: users see only their own memberships.
create policy office_membership_self_read on public.office_memberships for select to authenticated
 using (user_id = (select auth.uid()));
create policy office_organization_member_read on public.office_organizations for select to authenticated
 using (exists (
 select 1 from public.office_memberships m
 where m.organization_id=office_organizations.id and m.user_id=(select auth.uid())
 ));
create policy office_request_member_read on public.office_requests for select to authenticated
 using (exists (
 select 1 from public.office_memberships m
 where m.organization_id=office_requests.organization_id and m.user_id=(select auth.uid())
 ));
create policy office_request_member_submit on public.office_requests for insert to authenticated
 with check (
 created_by=(select auth.uid())
 and exists (
 select 1 from public.office_memberships m
 where m.organization_id=office_requests.organization_id
 and m.user_id=(select auth.uid()) and m.role in ('owner','admin','member')
 )
 );
-- No browser UPDATE/DELETE or membership-creation policies.
-- Verified server onboarding must create organization + owner membership atomically.
commit;
