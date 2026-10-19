begin;
insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','chat-test-a@example.invalid'),('22222222-2222-4222-8222-222222222222','chat-test-b@example.invalid');
insert into public.office_organizations(id,name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Chat A'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Chat B');
insert into public.office_memberships(organization_id,user_id,role) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner');
do $$ declare result jsonb; begin
 result:=public.reserve_office_chat('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','maya','First test');
 if (result->>'reused')::boolean then raise exception 'first request reused';end if;
 result:=public.reserve_office_chat('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','maya','First test');
 if not (result->>'reused')::boolean then raise exception 'retry not reused';end if;
 begin perform public.reserve_office_chat(gen_random_uuid(),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','maya','Wrong business');raise exception 'cross business allowed';exception when raise_exception then if sqlerrm<>'not_a_member' then raise;end if;end;
 begin perform public.reserve_office_chat(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','forge','Unpaid');raise exception 'unpaid Forge allowed';exception when raise_exception then if sqlerrm<>'package_required' then raise;end if;end;
 begin perform public.reserve_office_chat(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','maya','Too soon');raise exception 'throttle failed';exception when raise_exception then if sqlerrm<>'slow_down' then raise;end if;end;
end $$;
update public.office_chat_turns set state='complete',reply='Test reply',created_at=now()-interval '10 seconds';
insert into public.office_chat_turns(id,organization_id,created_by,character,user_text,state,reply) values (gen_random_uuid(),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','maya','Other private question','complete','Other private answer');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.office_chat_turns)<>1 then raise exception 'private history isolation failed';end if;
 begin insert into public.office_chat_turns(id,organization_id,created_by,character,user_text) values(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'maya','Forged');raise exception 'client insert allowed';exception when insufficient_privilege then null;end;
 begin update public.office_chat_turns set reply='Fake assistant';raise exception 'client update allowed';exception when insufficient_privilege then null;end;
 begin perform public.reserve_office_chat(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'maya','Bypass');raise exception 'client RPC allowed';exception when insufficient_privilege then null;end;
 begin perform * from public.office_chat_server_auth;raise exception 'server key exposed';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into public.office_chat_turns(id,organization_id,created_by,character,user_text,created_at) select gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','maya','Quota fixture',now()-interval '10 seconds' from generate_series(1,19);
do $$ begin
 begin perform public.reserve_office_chat(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','maya','Over quota');raise exception 'daily quota failed';exception when raise_exception then if sqlerrm<>'daily_limit' then raise;end if;end;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.office_chat_turns;raise exception 'anon history allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'chat access, quota, throttle and idempotency tests passed; fixtures rolled back' as result;
rollback;
