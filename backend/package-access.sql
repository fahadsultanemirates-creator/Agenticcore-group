-- Package access is granted only by trusted billing/admin services after purchase.
begin;
create table public.office_package_access (
 organization_id uuid primary key references public.office_organizations(id) on delete cascade,
 enabled boolean not null default false,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 check (ends_at > starts_at)
);
alter table public.office_package_access enable row level security;
revoke all on public.office_package_access from public, anon, authenticated;
grant select on public.office_package_access to authenticated;
grant all on public.office_package_access to service_role;
create policy office_package_active_member_read on public.office_package_access
 for select to authenticated using (
 enabled and starts_at <= now() and ends_at > now()
 and organization_id in (select m.organization_id from public.office_memberships m where m.user_id=(select auth.uid()))
 );
commit;
