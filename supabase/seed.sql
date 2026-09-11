-- Seed de desenvolvimento: cria um grupo e um perfil padrão para o primeiro usuário autenticado.
-- Execute após criar o usuário no Supabase Auth. Substitua o e-mail.
do $$
declare v_user uuid; v_group uuid;
begin
  select id into v_user from auth.users where email = 'admin@example.com';
  if v_user is null then raise notice 'Usuário não encontrado; crie-o no Auth antes.'; return; end if;
  insert into public.users (id, email) values (v_user, 'admin@example.com') on conflict do nothing;
  insert into groups (name, slug, created_by) values ('Grupo de Investidoras', 'grupo-investidoras', v_user) returning id into v_group;
  insert into group_members (group_id, user_id, role, accepted_at) values (v_group, v_user, 'ADMIN', now());
  -- O perfil padrão é criado pela aplicação na primeira visita (usa DEFAULT_PROFILE do domínio).
end $$;
