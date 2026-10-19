begin;
insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','file-test-a@example.invalid'),('22222222-2222-4222-8222-222222222222','file-test-b@example.invalid');
insert into public.office_organizations(id,name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Files A'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Files B');
insert into public.office_memberships(organization_id,user_id,role) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner');
select public.reserve_office_chat_file('77777777-7777-4777-8777-777777777777','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','notes.txt','text/plain',12);
select public.reserve_office_chat_file('88888888-8888-4888-8888-888888888888','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','private.txt','text/plain',12);
select public.reserve_office_chat('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','maya','Review attachment');
do $$ begin
 begin perform public.link_office_chat_files('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',array['88888888-8888-4888-8888-888888888888'::uuid],false);raise exception 'cross-user file linked';exception when raise_exception then if sqlerrm<>'invalid_files' then raise;end if;end;
end $$;
select public.link_office_chat_files('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',array['77777777-7777-4777-8777-777777777777'::uuid],false);
do $$ begin
 if (select cardinality(file_ids) from public.office_chat_turns where id='55555555-5555-4555-8555-555555555555')<>1 then raise exception 'file not linked';end if;
 begin perform public.link_office_chat_files('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','{}'::uuid[],true);raise exception 'replay attachment change allowed';exception when raise_exception then if sqlerrm<>'request_conflict' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.office_chat_files)<>1 then raise exception 'private file read isolation failed';end if;
 begin update public.office_chat_files set created_by='22222222-2222-4222-8222-222222222222';raise exception 'file reassignment allowed';exception when insufficient_privilege then null;end;
 begin perform public.reserve_office_chat_file(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'fake.txt','text/plain',12);raise exception 'client upload RPC allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 begin perform public.reserve_office_chat_file(gen_random_uuid(),'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','other.txt','text/plain',12);raise exception 'cross-business upload allowed';exception when raise_exception then if sqlerrm<>'not_a_member' then raise;end if;end;
 if (select public from storage.buckets where id='office-chat-files') then raise exception 'bucket must be private';end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.office_chat_files;raise exception 'anonymous metadata read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'attachment isolation, linkage, replay and private bucket checks passed; fixtures rolled back' as result;
rollback;
