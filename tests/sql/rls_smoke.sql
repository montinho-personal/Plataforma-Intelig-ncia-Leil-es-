-- Teste de fumaça de RLS e append-only. Executar com psql -v ON_ERROR_STOP=1 em banco com a migração aplicada
-- e o stub de auth (tests/sql/auth_stub.sql) quando fora do Supabase.
begin;
create role app_user nologin;
grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
grant execute on all functions in schema public to app_user;

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@x.com'), ('22222222-2222-2222-2222-222222222222', 'b@x.com');
insert into groups (id, name, slug) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'G1', 'g1'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'G2', 'g2');
insert into group_members (group_id, user_id, role) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'ANALISTA'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'ADMIN');
insert into properties (id, group_id, code, type, title, city, usable_area_m2) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 'APARTAMENTO', 'Apto G1', 'SP', 98);
insert into properties (id, group_id, code, type, title, city, usable_area_m2) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 'CASA', 'Casa G2', 'SP', 200);

-- usuário 1 (grupo A) só vê o próprio grupo
set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$ begin
  if (select count(*) from properties) <> 1 then raise exception 'RLS falhou: usuário vê % imóveis', (select count(*) from properties); end if;
  if (select title from properties) <> 'Apto G1' then raise exception 'RLS falhou: imóvel errado'; end if;
end $$;
-- ANALISTA não pode aprovar teto (só ADMIN)
do $$ begin
  begin
    insert into bid_approvals (group_id, property_id, approved_cap_amount, approved_by, valid_until) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 1, '11111111-1111-1111-1111-111111111111', now() + interval '30 days');
    raise exception 'RBAC falhou: ANALISTA aprovou teto';
  exception when insufficient_privilege then null; end;
end $$;
-- ANALISTA não pode editar o perfil
do $$ begin
  begin
    insert into investment_profiles (group_id, name, min_roi, target_roi, valuation_config, renovation_table, cost_table, team_fee, scenario_config) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 0.1, 0.2, '{}', '{}', '{}', '{}', '{}');
    raise exception 'RBAC falhou: ANALISTA editou perfil';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- auditoria registrou as inserções
do $$ begin
  if (select count(*) from audit_logs where table_name = 'properties') <> 2 then raise exception 'auditoria falhou'; end if;
end $$;

-- ledger append-only
insert into projects (id, group_id, property_id) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
insert into transactions (id, group_id, project_id, type, amount, occurred_at, hash) values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'APORTE', 100000, '2026-09-01', 'h1');
do $$ begin
  begin
    update transactions set amount = 1 where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    raise exception 'append-only falhou: UPDATE permitido';
  exception when raise_exception then
    if sqlerrm not like '%append-only%' then raise; end if;
  end;
  begin
    delete from transactions where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    raise exception 'append-only falhou: DELETE permitido';
  exception when raise_exception then
    if sqlerrm not like '%append-only%' then raise; end if;
  end;
end $$;
select 'RLS/RBAC/AUDIT/APPEND-ONLY OK' as result;
rollback;
