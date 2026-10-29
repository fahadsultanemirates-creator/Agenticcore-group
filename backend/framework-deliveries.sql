-- Applied to the Group project; only the server-side bridge can publish delivery records.
create function public.record_framework_delivery(p_order_id uuid,p_event_id text,p_path text,p_filename text) returns uuid language plpgsql security invoker set search_path='' as $$
declare o public.office_orders;project uuid;delivery uuid;
begin
 select * into o from public.office_orders where id=p_order_id for update;
 if o.id is null then raise exception 'Order not found';end if;
 select id into delivery from public.office_deliverables where bridge_event_id=p_event_id;
 if delivery is not null then return delivery;end if;
 if p_path not like o.organization_id::text||'/'||o.id::text||'/%' then raise exception 'Invalid file path';end if;
 select id into project from public.office_projects where organization_id=o.organization_id and title='Order GRP-'||o.id limit 1;
 if project is null then insert into public.office_projects(organization_id,title,description,department,status) values(o.organization_id,'Order GRP-'||o.id,'Delivery for your service order','Coordination','completed') returning id into project;end if;
 delivery:=gen_random_uuid();
 insert into public.office_deliverables(id,organization_id,project_id,order_id,label,url,storage_path,bridge_event_id,notes) values(delivery,o.organization_id,project,o.id,p_filename,'https://agenticcore.group/workspace?delivery='||delivery,p_path,p_event_id,'Delivered through the shared AgenticCore bot.');
 update public.office_projects set status='completed' where id=project;update public.office_orders set fulfillment_status='delivered' where id=o.id;return delivery;
end $$;
revoke all on function public.record_framework_delivery(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.record_framework_delivery(uuid,text,text,text) to service_role;
