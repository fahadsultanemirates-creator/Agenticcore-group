-- Isolated rollback-only checks; never persists users, memberships or requests.
begin;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','core-test-a@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','core-test-b@example.invalid'),
 ('33333333-3333-4333-8333-333333333333','core-test-viewer@example.invalid'),
 ('44444444-4444-4444-8444-444444444444','core-test-outsider@example.invalid');
insert into public.office_organizations(id,name) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Core test A'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Core test B');
insert into public.office_memberships(organization_id,user_id,role) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','viewer');
insert into public.office_requests(organization_id,created_by,route,brief) values
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','managed','{"test":true}');
set local role anon;
do $$ begin
 begin perform * from public.office_requests; raise exception 'anon read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.office_organizations) <> 1 then raise exception 'organization isolation failed'; end if;
 if (select count(*) from public.office_memberships) <> 1 then raise exception 'membership isolation failed'; end if;
 if (select count(*) from public.office_requests) <> 0 then raise exception 'request isolation failed'; end if;
 insert into public.office_requests(organization_id,route,brief) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','managed','{"goal":"test"}');
 if not exists(select 1 from public.office_requests where created_by=auth.uid() and status='submitted' and source_site='group') then raise exception 'safe defaults failed'; end if;
 begin
 insert into public.office_requests(organization_id,route,brief) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','managed','{}');
 raise exception 'cross-org insert allowed'; exception when insufficient_privilege then null; end;
 begin
 insert into public.office_requests(organization_id,route,brief,status) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','managed','{}','scoped');
 raise exception 'forged status allowed'; exception when insufficient_privilege then null; end;
 begin
 update public.office_requests set status='scoped';
 raise exception 'client update allowed'; exception when insufficient_privilege then null; end;
 begin
 delete from public.office_requests;
 raise exception 'client delete allowed'; exception when insufficient_privilege then null; end;
 begin
 insert into public.office_memberships(organization_id,user_id,role) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',auth.uid(),'owner');
 raise exception 'membership escalation allowed'; exception when insufficient_privilege then null; end;
 begin
 insert into public.office_requests(organization_id,route,brief) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bad','{}');
 raise exception 'invalid route allowed'; exception when check_violation then null; end;
 begin
 insert into public.office_requests(organization_id,route,brief) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','managed','[]');
 raise exception 'array brief allowed'; exception when check_violation then null; end;
 begin
 insert into public.office_requests(organization_id,route,brief) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','managed',jsonb_build_object('text',repeat('a',66000)));
 raise exception 'oversized brief allowed'; exception when check_violation then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.office_requests) <> 1 then raise exception 'viewer read failed'; end if;
 begin
 insert into public.office_requests(organization_id,route,brief) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','managed','{}');
 raise exception 'viewer submit allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.office_organizations) <> 0 then raise exception 'outsider organization read allowed'; end if;
 begin
 insert into public.office_requests(organization_id,route,brief) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','managed','{}');
 raise exception 'outsider submit allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from public.office_memberships where user_id='11111111-1111-4111-8111-111111111111';
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.office_requests) <> 0 then raise exception 'revoked member read allowed'; end if;
end $$;
reset role;
select 'core access checks passed; all fixtures rolled back' as result;
rollback;
