
select 
  u.email,
  om.role,
  o.name as org_name,
  o.id as org_id
from auth.users u
left join public.organization_members om on u.id = om.user_id
left join public.organizations o on om.organization_id = o.id
where u.email = 'aki.ruthwik@gmail.com';
