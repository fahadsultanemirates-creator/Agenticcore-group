begin;
insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','forge-test@example.invalid');
insert into public.office_organizations(id,name) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Package test A'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Package test B');
insert into public.office_memberships(organization_id,user_id,role) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner');
insert into public.office_package_access values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true,now()-interval '1 day',now()+interval '1 day'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true,now()-interval '1 day',now()+interval '1 day');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.office_package_access) <> 1 then raise exception 'package isolation failed'; end if;
 begin update public.office_package_access set ends_at=now()+interval '1 year';raise exception 'client package update allowed';exception when insufficient_privilege then null;end;
 begin insert into public.office_package_access values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',true,now(),now()+interval '1 day');raise exception 'client grant allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.office_package_access set ends_at=now()-interval '1 second' where organization_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;
do $$ begin if exists(select 1 from public.office_package_access) then raise exception 'expired access allowed';end if;end $$;
reset role;
update public.office_package_access set starts_at=now()+interval '1 day',ends_at=now()+interval '2 days' where organization_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;
do $$ begin if exists(select 1 from public.office_package_access) then raise exception 'future access allowed';end if;end $$;
reset role;
update public.office_package_access set enabled=false,starts_at=now()-interval '1 day',ends_at=now()+interval '1 day' where organization_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
set local role authenticated;
do $$ begin if exists(select 1 from public.office_package_access) then raise exception 'revoked access allowed';end if;end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.office_package_access;raise exception 'anonymous package read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'package access tests passed; fixtures rolled back' as result;
rollback;
