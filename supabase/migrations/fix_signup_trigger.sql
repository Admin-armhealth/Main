-- Create a function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  org_id uuid;
  hospital_name text;
  is_invite boolean;
begin
  -- 1. Check if user is joining via Invite (metadata check or invites table check)
  -- For now, let's rely on metadata passed from signUp options
  is_invite := (new.raw_user_meta_data->>'joined_via_invite') is not null;
  hospital_name := new.raw_user_meta_data->>'hospital_name';

  -- If joining via invite, we do NOTHING here. The API or client must handle the join logic 
  -- (because we need to verify the token/org_id validity which is hard in a trigger without more context).
  if is_invite then
    return new;
  end if;

  -- 2. If NOT invite, Create a New Organization
  if hospital_name is null then
    hospital_name := 'My Clinic'; -- Default fallback
  end if;

  insert into public.organizations (name)
  values (hospital_name)
  returning id into org_id;

  -- 3. Add User as ADMIN of that Organization
  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, new.id, 'admin');

  -- 4. Create User Profile
  insert into public.user_profiles (id, organization_id, full_name)
  values (new.id, org_id, new.raw_user_meta_data->>'full_name');

  return new;
end;
$$;

-- Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
