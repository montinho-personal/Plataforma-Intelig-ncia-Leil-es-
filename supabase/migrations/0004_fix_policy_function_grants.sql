-- Correção da 0003: as políticas RLS executam is_member/has_role com o papel da usuária,
-- portanto `authenticated` precisa de EXECUTE. Continuam revogadas para anon.
grant execute on function is_member(uuid) to authenticated;
grant execute on function has_role(uuid, member_role[]) to authenticated;
