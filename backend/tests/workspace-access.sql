begin;
insert into auth.users(id,email) values ('55555555-5555-4555-8555-555555555555','workspace-a@example.invalid'),('66666666-6666-4666-8666-666666666666','workspace-b@example.invalid');
set local role service_role;
do $$ declare first_id uuid; second_id uuid; begin
 first_id:=public.provision_office('55555555-5555-4555-8555-555555555555','Workspace A');
 second_id:=public.provision_office('55555555-5555-4555-8555-555555555555','Retry A');
 if first_id<>second_id then raise exception 'Duplicate office created on retry'; end if;
 perform public.provision_office('66666666-6666-4666-8666-666666666666','Workspace B');
end $$;
reset role;
insert into public.office_projects(id,organization_id,title)
 select '77777777-7777-4777-8777-777777777777',organization_id,'A Project' from public.office_memberships where user_id='55555555-5555-4555-8555-555555555555';
insert into public.office_projects(id,organization_id,title)
 select '88888888-8888-4888-8888-888888888888',organization_id,'B Project' from public.office_memberships where user_id='66666666-6666-4666-8666-666666666666';
insert into public.office_milestones(project_id,organization_id,title) select id,organization_id,'Test milestone' from public.office_projects;
insert into public.office_deliverables(project_id,organization_id,label,url) select id,organization_id,'Test delivery','https://example.invalid/file' from public.office_projects;
insert into public.office_updates(organization_id,title) select organization_id,'Test update' from public.office_memberships where role='owner';
select set_config('request.jwt.claims','{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.office_projects) <> 1 then raise exception 'Project isolation failed'; end if;
 if (select count(*) from public.office_milestones) <> 1 then raise exception 'Milestone isolation failed'; end if;
 if (select count(*) from public.office_deliverables) <> 1 then raise exception 'Delivery isolation failed'; end if;
 if (select count(*) from public.office_updates) <> 1 then raise exception 'Update isolation failed'; end if;
 begin perform public.provision_office('66666666-6666-4666-8666-666666666666','Forged'); raise exception 'Client provisioning RPC allowed'; exception when insufficient_privilege then null; end;
 begin update public.office_projects set status='completed'; raise exception 'Client project status update allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 begin insert into public.office_milestones(project_id,organization_id,title)
 select '77777777-7777-4777-8777-777777777777',organization_id,'Wrong business' from public.office_memberships where user_id='66666666-6666-4666-8666-666666666666';
 raise exception 'Mismatched project/business allowed'; exception when foreign_key_violation then null; end;
end $$;
select 'workspace access and retry checks passed; fixtures rolled back' as result;
rollback;
