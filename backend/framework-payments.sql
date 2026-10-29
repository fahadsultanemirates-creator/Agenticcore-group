begin;
create sequence public.group_payment_nonce minvalue 1 maxvalue 999999 no cycle;
grant usage on sequence public.group_payment_nonce to authenticated,service_role;
alter table public.office_orders add column payment_nonce bigint;
alter table public.office_orders add column expected_amount text;
alter table public.office_orders add column ac_usd_rate numeric;
alter table public.office_orders add column paid_cents bigint not null default 0;
create or replace function public.price_office_order() returns trigger language plpgsql set search_path='' as $$
declare c jsonb:=new.configuration; route text:=c->>'route'; term text:=coalesce(c->>'term','cycle'); amount bigint:=0; multiplier int; item text; n int;
begin
 if auth.uid() is null or new.created_by<>auth.uid() then raise exception 'Sign in to place an order'; end if;
 if route='managed' then
  multiplier:=case c->>'level' when 'essential' then 1 when 'growth' then 2 when 'extended' then 3 else 0 end;
  if multiplier=0 or jsonb_typeof(c->'departments') is distinct from 'array' then raise exception 'Choose departments and a work level'; end if;
  select count(distinct value),count(*) into n,amount from jsonb_array_elements_text(c->'departments');
  if n<1 or n>7 or n<>amount then raise exception 'Choose distinct valid departments'; end if;
  amount:=0;
  for item in select value from jsonb_array_elements_text(c->'departments') loop
   amount:=amount+case item when 'admin' then 10000 when 'creative' then 15000 when 'marketing' then 20000 when 'customer' then 15000 when 'finance' then 15000 when 'research' then 10000 when 'technology' then 15000 else -10000000 end;
  end loop;
  if amount<=0 then raise exception 'Unknown department'; end if;
  amount:=amount*multiplier;
  if term='annual' then amount:=amount*13*80/100; elsif term<>'cycle' then raise exception 'Unknown service term'; end if;
  new.status:='awaiting_payment';
 elsif route='owned' then
  amount:=case c->>'packageId' when 'starter' then 150000 when 'team' then 300000 when 'business' then 500000 when 'full' then 1000000 else 0 end;
  if amount=0 then raise exception 'Choose a valid framework'; end if;
  new.status:='needs_scope';
 else raise exception 'Choose an office route'; end if;
 new.service_total_cents:=amount;
 new.discount_cents:=case when new.payment_method='ac' then amount/10 else 0 end;
 new.total_cents:=amount-new.discount_cents;
 new.due_cents:=case when new.schedule='installments' then new.total_cents/4 else new.total_cents end;
 if new.payment_method='ac' and now()>='2027-04-29T00:00:00Z'::timestamptz then raise exception 'The fixed AC rate has expired. Request a new quote.'; end if;
 new.payment_nonce:=nextval('public.group_payment_nonce');
 while new.payment_nonce%100=0 loop new.payment_nonce:=nextval('public.group_payment_nonce'); end loop;
 if new.payment_method='ac' then
  new.ac_usd_rate:=0.0000006;
  new.expected_amount:=trim(trailing '.' from trim(trailing '0' from to_char((new.due_cents::numeric/100)/0.0000006+new.payment_nonce::numeric/1000000,'FM9999999999999999999990.000000')));
 else new.expected_amount:=to_char(new.due_cents::numeric/100+new.payment_nonce::numeric/100000000,'FM9999999999999990.00000000'); end if;
 return new;
end $$;

create table public.framework_payments(tx_hash text primary key,order_id uuid not null unique references public.office_orders(id),verified_at timestamptz not null default now());
alter table public.framework_payments enable row level security;
revoke all on public.framework_payments from public,anon,authenticated;grant all on public.framework_payments to service_role;
create function public.settle_framework_order(p_order_id uuid,p_tx_hash text) returns boolean language plpgsql security invoker set search_path='' as $$
declare o public.office_orders;
begin
 if p_tx_hash !~ '^0x[0-9a-f]{64}$' then raise exception 'Invalid transaction';end if;
 select * into o from public.office_orders where id=p_order_id for update;
 if o.id is null or o.status<>'awaiting_payment' then return false;end if;
 insert into public.framework_payments(tx_hash,order_id) values(p_tx_hash,o.id) on conflict do nothing;
 if not found then return false;end if;
 update public.office_orders set status='paid',paid_cents=due_cents where id=o.id;
 insert into public.framework_events(kind,record_id,payload) values('payment_verified',o.id,jsonb_build_object('reference','GRP-'||o.id,'transaction_hash',p_tx_hash,'due_cents',o.due_cents)) on conflict do nothing;
 return true;
end $$;
revoke all on function public.settle_framework_order(uuid,text) from public,anon,authenticated;grant execute on function public.settle_framework_order(uuid,text) to service_role;
commit;
