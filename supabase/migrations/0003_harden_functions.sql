-- Endurecimento apontado pelo linter do Supabase:
-- 1) funções de trigger e internas não devem ser chamáveis via RPC por anon/authenticated;
-- 2) supersede_bid_approval só por ADMIN do grupo (defesa em profundidade além da aplicação);
-- 3) search_path fixo em todas as funções.

alter function set_updated_at() set search_path = public;
alter function deny_mutation() set search_path = public;

revoke execute on function audit_row() from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function set_updated_at() from public, anon, authenticated;
revoke execute on function deny_mutation() from public, anon, authenticated;

-- usadas apenas dentro das políticas RLS (executam como owner): sem acesso via RPC
revoke execute on function is_member(uuid) from public, anon, authenticated;
revoke execute on function has_role(uuid, member_role[]) from public, anon, authenticated;

-- chamadas pela aplicação como usuária autenticada: exigem membership/papel
create or replace function next_property_code(p_group uuid) returns int
language plpgsql volatile security definer set search_path = public as $$
begin
  if not has_role(p_group, '{ADMIN,ANALISTA}') then
    raise exception 'Sem permissão para gerar código de imóvel neste grupo';
  end if;
  return (select coalesce(max(code), 0) + 1 from properties where group_id = p_group);
end; $$;
revoke execute on function next_property_code(uuid) from public, anon;
grant execute on function next_property_code(uuid) to authenticated;

create or replace function supersede_bid_approval(p_old uuid, p_new uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_group uuid;
begin
  select group_id into v_group from bid_approvals where id = p_new;
  if v_group is null or not has_role(v_group, '{ADMIN}') then
    raise exception 'Somente ADMIN do grupo pode substituir um teto aprovado';
  end if;
  if not exists (select 1 from bid_approvals where id = p_old and group_id = v_group) then
    raise exception 'Aprovação anterior não pertence ao mesmo grupo';
  end if;
  alter table bid_approvals disable trigger deny_update_bid_approvals;
  update bid_approvals set superseded_by = p_new where id = p_old and superseded_by is null;
  alter table bid_approvals enable trigger deny_update_bid_approvals;
end; $$;
revoke execute on function supersede_bid_approval(uuid, uuid) from public, anon;
grant execute on function supersede_bid_approval(uuid, uuid) to authenticated;
