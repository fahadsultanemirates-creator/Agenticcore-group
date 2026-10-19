begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('office-chat-files','office-chat-files',false,4194304,array['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
create table public.office_chat_files (
 id uuid primary key,
 organization_id uuid not null references public.office_organizations(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 turn_id uuid references public.office_chat_turns(id) on delete set null,
 name text not null check(length(name) between 1 and 150),
 mime text not null check(mime in ('image/jpeg','image/png','image/webp','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
 size integer not null check(size between 1 and 4194304),
 object_path text not null unique,
 created_at timestamptz not null default now(),
 check(object_path=organization_id::text||'/'||created_by::text||'/'||id::text)
);
create index office_chat_files_user_date_idx on public.office_chat_files(created_by,created_at desc);
create index office_chat_files_org_idx on public.office_chat_files(organization_id);
create index office_chat_files_turn_idx on public.office_chat_files(turn_id);
alter table public.office_chat_files enable row level security;
revoke all on public.office_chat_files from public,anon,authenticated;
grant select on public.office_chat_files to authenticated;
grant all on public.office_chat_files to service_role;
create policy office_chat_files_owner_read on public.office_chat_files for select to authenticated using (
 created_by=(select auth.uid()) and organization_id in (select organization_id from public.office_memberships where user_id=(select auth.uid()))
);
create policy office_chat_files_private_download on storage.objects for select to authenticated using (
 bucket_id='office-chat-files' and name in (select object_path from public.office_chat_files where created_by=(select auth.uid()))
);
alter table public.office_chat_turns add column file_ids uuid[] not null default '{}';
create function public.reserve_office_chat_file(p_id uuid,p_org uuid,p_user uuid,p_name text,p_mime text,p_size integer)
returns public.office_chat_files language plpgsql security invoker set search_path=public,pg_temp as $$
declare f public.office_chat_files; today timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';begin
 perform pg_advisory_xact_lock(hashtextextended('office-chat-reserve-global',0));
 if not exists(select 1 from public.office_memberships where organization_id=p_org and user_id=p_user) then raise exception 'not_a_member';end if;
 select * into f from public.office_chat_files where id=p_id;
 if found then
  if f.organization_id<>p_org or f.created_by<>p_user or f.name<>p_name or f.mime<>p_mime or f.size<>p_size or f.turn_id is not null then raise exception 'request_conflict';end if;
  return f;
 end if;
 if (select count(*) from public.office_chat_files where created_by=p_user and created_at>=today)>=20
 or (select count(*) from public.office_chat_files where created_at>=today)>=200 then raise exception 'upload_limit';end if;
 insert into public.office_chat_files(id,organization_id,created_by,name,mime,size,object_path) values(p_id,p_org,p_user,p_name,p_mime,p_size,p_org::text||'/'||p_user::text||'/'||p_id::text) returning * into f;return f;
end $$;
revoke all on function public.reserve_office_chat_file(uuid,uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_office_chat_file(uuid,uuid,uuid,text,text,integer) to service_role;
create function public.link_office_chat_files(p_turn uuid,p_org uuid,p_user uuid,p_ids uuid[],p_reused boolean)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare t public.office_chat_turns;begin
 select * into t from public.office_chat_turns where id=p_turn and organization_id=p_org and created_by=p_user for update;
 if not found then raise exception 'not_a_member';end if;
 if p_ids is null or cardinality(p_ids)>3 or (select count(distinct x) from unnest(p_ids)x)<>cardinality(p_ids) then raise exception 'invalid_files';end if;
 if p_reused then
  if (select array_agg(x order by x) from unnest(t.file_ids)x) is distinct from (select array_agg(x order by x) from unnest(p_ids)x) then raise exception 'request_conflict';end if;return;
 end if;
 if t.state<>'pending' then raise exception 'request_conflict';end if;
 if (select count(*) from public.office_chat_files f where f.id=any(p_ids) and f.organization_id=p_org and f.created_by=p_user and (f.turn_id is null or f.turn_id=p_turn or exists(select 1 from public.office_chat_turns old where old.id=f.turn_id and old.state='failed')))<>cardinality(p_ids) then raise exception 'invalid_files';end if;
 update public.office_chat_files set turn_id=p_turn where id=any(p_ids);
 update public.office_chat_turns set file_ids=p_ids where id=p_turn;
end $$;
revoke all on function public.link_office_chat_files(uuid,uuid,uuid,uuid[],boolean) from public,anon,authenticated;
grant execute on function public.link_office_chat_files(uuid,uuid,uuid,uuid[],boolean) to service_role;
commit;
