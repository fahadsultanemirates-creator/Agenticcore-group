begin;
create table public.framework_bridge_access (id text primary key, key_hash text not null);
alter table public.framework_bridge_access enable row level security;
revoke all on public.framework_bridge_access from public,anon,authenticated;
grant all on public.framework_bridge_access to service_role;
create table public.framework_events (id uuid primary key default gen_random_uuid(),kind text not null,record_id uuid not null,payload jsonb not null,created_at timestamptz not null default now(),claimed_until timestamptz,delivered_at timestamptz,unique(kind,record_id));
alter table public.framework_events enable row level security;
revoke all on public.framework_events from public,anon,authenticated;
grant all on public.framework_events to service_role;
create function public.claim_framework_events() returns setof public.framework_events language sql security invoker set search_path='' as $$
 update public.framework_events set claimed_until=now()+interval '5 minutes' where id in(select id from public.framework_events where delivered_at is null and (claimed_until is null or claimed_until<now()) order by created_at limit 10 for update skip locked) returning *;
$$;
revoke all on function public.claim_framework_events() from public,anon,authenticated;grant execute on function public.claim_framework_events() to service_role;
create schema if not exists office_private;
revoke all on schema office_private from public,anon,authenticated;
create function office_private.queue_framework_event() returns trigger language plpgsql security definer set search_path='' as $$
declare info jsonb; kind text; ref uuid;
begin
 if tg_table_name='office_orders' then
  kind:='order';ref:=new.id;info:=jsonb_build_object('reference','GRP-'||new.id,'organization_id',new.organization_id,'configuration',new.configuration,'requirements',left(new.requirements,4000),'total_cents',new.total_cents,'due_cents',new.due_cents,'payment_method',new.payment_method,'status',new.status);
 elsif tg_table_name='office_payment_submissions' then
  kind:='payment_submitted';ref:=new.id;info:=jsonb_build_object('reference','GRP-'||new.order_id,'transaction_hash',new.transaction_hash,'status','verification pending');
 else
  kind:='request';ref:=new.id;info:=jsonb_build_object('reference','REQ-'||new.id,'organization_id',new.organization_id,'route',new.route,'title',left(new.brief->>'title',180),'brief',left(new.brief->>'text',4000));
 end if;
 insert into public.framework_events(kind,record_id,payload) values(kind,ref,info) on conflict do nothing;return new;
end $$;
revoke all on function office_private.queue_framework_event() from public,anon,authenticated;
create trigger group_order_to_framework after insert on public.office_orders for each row execute function office_private.queue_framework_event();
create trigger group_payment_to_framework after insert on public.office_payment_submissions for each row execute function office_private.queue_framework_event();
create trigger group_request_to_framework after insert on public.office_requests for each row execute function office_private.queue_framework_event();
alter table public.office_orders add column fulfillment_status text not null default 'pending' check(fulfillment_status in ('pending','in_progress','needs_information','delivered'));
alter table public.office_deliverables add column storage_path text;
alter table public.office_deliverables add column bridge_event_id text unique;
alter table public.office_deliverables add column order_id uuid references public.office_orders(id);
insert into storage.buckets(id,name,public,file_size_limit) values('office-deliveries','office-deliveries',false,15728640) on conflict(id) do nothing;
commit;
