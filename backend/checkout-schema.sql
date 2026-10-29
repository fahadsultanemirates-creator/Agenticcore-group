begin;
create table public.office_orders (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.office_organizations(id),
 created_by uuid not null default auth.uid() references auth.users(id), idempotency_key uuid not null,
 configuration jsonb not null check(octet_length(configuration::text)<12000),
 payment_method text not null check(payment_method in ('usdt','ac')), schedule text not null check(schedule in ('full','installments')),
 service_total_cents bigint not null, discount_cents bigint not null, total_cents bigint not null, due_cents bigint not null,
 status text not null default 'awaiting_payment' check(status in ('needs_scope','awaiting_payment','payment_review','paid','cancelled')),
 requirements text not null default '' check(length(requirements)<=4000), created_at timestamptz not null default now(),
 unique(created_by,idempotency_key)
);
create index office_orders_org_date on public.office_orders(organization_id,created_at desc);
create function public.price_office_order() returns trigger language plpgsql set search_path='' as $$
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
 return new;
end $$;
create trigger office_order_price before insert on public.office_orders for each row execute function public.price_office_order();
create table public.office_payment_submissions (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.office_orders(id),
 created_by uuid not null default auth.uid() references auth.users(id),
 transaction_hash text not null unique check(transaction_hash ~ '^0x[0-9a-f]{64}$'),
 created_at timestamptz not null default now()
);
alter table public.office_orders enable row level security;
alter table public.office_payment_submissions enable row level security;
revoke all on public.office_orders,public.office_payment_submissions from public,anon,authenticated;
grant select on public.office_orders,public.office_payment_submissions to authenticated;
grant insert(organization_id,idempotency_key,configuration,payment_method,schedule,requirements) on public.office_orders to authenticated;
grant insert(order_id,transaction_hash) on public.office_payment_submissions to authenticated;
grant all on public.office_orders,public.office_payment_submissions to service_role;
create policy office_orders_read on public.office_orders for select to authenticated using(exists(select 1 from public.office_memberships m where m.organization_id=office_orders.organization_id and m.user_id=(select auth.uid())));
create policy office_orders_insert on public.office_orders for insert to authenticated with check(created_by=(select auth.uid()) and exists(select 1 from public.office_memberships m where m.organization_id=office_orders.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin','member')));
create policy office_payment_read on public.office_payment_submissions for select to authenticated using(exists(select 1 from public.office_orders o where o.id=office_payment_submissions.order_id));
create policy office_payment_insert on public.office_payment_submissions for insert to authenticated with check(created_by=(select auth.uid()) and exists(select 1 from public.office_orders o join public.office_memberships m on m.organization_id=o.organization_id where o.id=office_payment_submissions.order_id and o.status='awaiting_payment' and m.user_id=(select auth.uid()) and m.role in ('owner','admin','member')));
revoke all on function public.price_office_order() from public,anon,authenticated;
commit;
