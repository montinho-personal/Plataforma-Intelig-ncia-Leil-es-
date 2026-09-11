-- Sistema privado, convite-only: toda usuária criada no Auth entra automaticamente no grupo padrão.
-- A primeira usuária vira ADMIN; as demais entram como VISUALIZACAO e a ADMIN ajusta o papel
-- em Configurações › Usuárias. Enquanto houver um único grupo, isso dispensa tela de convite.

insert into groups (name, slug) values ('Grupo de Investidoras', 'grupo-investidoras')
on conflict (slug) do nothing;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_group uuid;
  v_role member_role;
begin
  insert into public.users (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
    on conflict (id) do nothing;

  select id into v_group from groups where slug = 'grupo-investidoras';
  if v_group is not null then
    select case when exists (select 1 from group_members where group_id = v_group) then 'VISUALIZACAO' else 'ADMIN' end
      into v_role;
    insert into group_members (group_id, user_id, role, accepted_at)
      values (v_group, new.id, v_role, now())
      on conflict do nothing;
  end if;
  return new;
end; $$;
