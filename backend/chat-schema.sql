begin;
create table public.office_chat_server_auth (
 id boolean primary key default true check(id),
 token_hash text not null check(length(token_hash)=64)
);
alter table public.office_chat_server_auth enable row level security;
revoke all on public.office_chat_server_auth from public,anon,authenticated;
grant all on public.office_chat_server_auth to service_role;
create policy office_chat_server_only on public.office_chat_server_auth for all to service_role using(true) with check(true);
create table public.office_chat_turns (
 id uuid primary key,
 organization_id uuid not null references public.office_organizations(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 character text not null check(character in ('forge','maya','atlas','nova','leo','iris','ledger','sage','orion','amara')),
 user_text text not null check(length(user_text) between 1 and 2000),
 state text not null default 'pending' check(state in ('pending','complete','failed')),
 reply text check(length(reply)<=12000),
 suggestion jsonb,
 model text,
 input_tokens integer,
 output_tokens integer,
 created_at timestamptz not null default now()
);
create index office_chat_user_date_idx on public.office_chat_turns(created_by,created_at desc);
create index office_chat_org_date_idx on public.office_chat_turns(organization_id,created_at desc);
create index office_chat_date_idx on public.office_chat_turns(created_at);
alter table public.office_chat_turns enable row level security;
revoke all on public.office_chat_turns from public,anon,authenticated;
grant select on public.office_chat_turns to authenticated;
grant all on public.office_chat_turns to service_role;
create policy office_chat_own_member_read on public.office_chat_turns for select to authenticated using (
 created_by=(select auth.uid())
 and organization_id in (select organization_id from public.office_memberships where user_id=(select auth.uid()))
 and (character<>'forge' or organization_id in (select organization_id from public.office_package_access))
);
create function public.reserve_office_chat(p_id uuid,p_org uuid,p_user uuid,p_character text,p_text text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare prior public.office_chat_turns; paid boolean; today timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
 perform pg_advisory_xact_lock(hashtextextended('office-chat-reserve-global',0));
 if not exists(select 1 from public.office_memberships where organization_id=p_org and user_id=p_user) then raise exception 'not_a_member';end if;
 select exists(select 1 from public.office_package_access where organization_id=p_org and enabled and starts_at<=now() and ends_at>now()) into paid;
 if p_character='forge' and not paid then raise exception 'package_required';end if;
 select * into prior from public.office_chat_turns where id=p_id;
 if found then
  if prior.organization_id<>p_org or prior.created_by<>p_user or prior.character<>p_character or prior.user_text<>p_text then raise exception 'request_conflict';end if;
  return jsonb_build_object('id',prior.id,'state',prior.state,'reply',prior.reply,'suggestion',prior.suggestion,'reused',true);
 end if;
 if (select count(*) from public.office_chat_turns where created_by=p_user and created_at>=today)>=(case when paid then 100 else 20 end)
 or (select count(*) from public.office_chat_turns where organization_id=p_org and created_at>=today)>=200
 or (select count(*) from public.office_chat_turns where created_at>=today)>=1000 then raise exception 'daily_limit';end if;
 if exists(select 1 from public.office_chat_turns where created_by=p_user and created_at>now()-interval '5 seconds') then raise exception 'slow_down';end if;
 insert into public.office_chat_turns(id,organization_id,created_by,character,user_text) values(p_id,p_org,p_user,p_character,p_text);
 return jsonb_build_object('id',p_id,'state','pending','reused',false);
end $$;
revoke all on function public.reserve_office_chat(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_office_chat(uuid,uuid,uuid,text,text) to service_role;
commit;
