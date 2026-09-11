-- ============================================================
-- Leilão OS — schema inicial (Fase 1 + estrutura das fases seguintes)
-- Convenções: ids uuid imutáveis; dinheiro em centavos (bigint) + moeda + data + origem;
-- percentuais em fração numeric(9,6); RLS por grupo; tabelas financeiras append-only.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type member_role as enum ('ADMIN','ANALISTA','INVESTIDOR','JURIDICO','FINANCEIRO','VISUALIZACAO');
create type epistemic_status as enum ('FACT','ESTIMATE','HYPOTHESIS','MISSING');
create type extraction_status as enum ('CONFIRMED','PROBABLE','UNCERTAIN','NOT_FOUND','NEEDS_HUMAN_REVIEW');
create type property_status as enum ('RADAR','TRIAGEM','EM_ANALISE','APROVADO','REPROVADO','ARREMATADO','ENCERRADO','DESCARTADO');
create type property_type as enum ('APARTAMENTO','CASA','TERRENO','COMERCIAL','RURAL','OUTRO');
create type building_standard as enum ('ECONOMICO','MEDIO','ALTO','LUXO');
create type conservation as enum ('RUIM','REGULAR','BOM','REFORMADO','NOVO');
create type occupancy as enum ('DESOCUPADO','OCUPADO','DESCONHECIDO');
create type liquidity_class as enum ('ALTA','MEDIA','BAIXA');
create type auction_modality as enum ('JUDICIAL','EXTRAJUDICIAL');
create type comparable_kind as enum ('LISTING','SOLD','GROUP_HISTORY');
create type valuation_status as enum ('OK','INSUFFICIENT_DATA','ATYPICAL');
create type renovation_level as enum ('NONE','COSMETIC','LIGHT','MEDIUM','HEAVY','FULL');
create type risk_category as enum ('JURIDICO','FINANCEIRO','MERCADO','OCUPACAO','REFORMA','LIQUIDEZ','DOCUMENTAL');
create type risk_status as enum ('ABERTO','MITIGADO','ACEITO','ENCERRADO');
create type decision_kind as enum ('APROVAR','APROVAR_COM_CONDICOES','REVISAR','REPROVAR');
create type document_kind as enum ('EDITAL','MATRICULA','PROCESSO','LAUDO','FOTO','OUTRO');
create type project_stage as enum ('ARREMATADO','PAGAMENTO','DOCUMENTACAO','REGISTRO','POSSE','DESOCUPACAO','REFORMA','ANUNCIO','PROPOSTA','VENDA','ENCERRADO');
create type transaction_type as enum ('APORTE','DESPESA','RECEITA','REEMBOLSO','DISTRIBUICAO','AJUSTE');

-- ---------- Identidade e acesso ----------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  mfa_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role member_role not null default 'VISUALIZACAO',
  invited_by uuid references users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on group_members (user_id);

create table investors (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid references users(id),
  name text not null,
  document_masked text,
  bank_info_encrypted text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create index on investors (group_id);

-- ---------- Funções de autorização (usadas pelas políticas RLS) ----------
create or replace function is_member(p_group uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members gm where gm.group_id = p_group and gm.user_id = auth.uid());
$$;

create or replace function has_role(p_group uuid, p_roles member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members gm where gm.group_id = p_group and gm.user_id = auth.uid() and gm.role = any(p_roles));
$$;

-- ---------- Perfil de investimento (nada hardcoded) ----------
create table investment_profiles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  min_roi numeric(9,6) not null,
  target_roi numeric(9,6) not null,
  min_roe numeric(9,6),
  min_irr_annual numeric(9,6),
  min_margin numeric(9,6),
  min_profit_amount bigint,
  max_capital_amount bigint,
  max_months int,
  accepted_modalities auction_modality[] not null default '{JUDICIAL,EXTRAJUDICIAL}',
  accepted_property_types property_type[] not null default '{APARTAMENTO,CASA}',
  locations jsonb not null default '[]'::jsonb,
  max_risk_level text not null default 'MEDIO',
  default_exit_horizon_days int not null default 90,
  default_holding_months int not null default 4,
  default_eviction_months_if_occupied int not null default 3,
  default_eviction_cost_if_occupied bigint not null default 0,
  region_factor numeric(6,3) not null default 1,
  valuation_config jsonb not null,
  renovation_table jsonb not null,
  cost_table jsonb not null,
  team_fee jsonb not null,
  scenario_config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create index on investment_profiles (group_id);
create unique index investment_profiles_one_default on investment_profiles (group_id) where is_default;

-- ---------- Fontes e imóveis ----------
create table auction_sources (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  name text not null,
  url text,
  type text not null default 'MANUAL',
  compliance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  code int not null,
  status property_status not null default 'RADAR',
  type property_type not null,
  title text not null,
  address text,
  number text,
  complement text,
  neighborhood text,
  city text not null,
  state text not null default 'SP',
  zip text,
  condo_name text,
  lat double precision,
  lng double precision,
  usable_area_m2 numeric(10,2) not null,
  built_area_m2 numeric(10,2),
  land_area_m2 numeric(10,2),
  registry_area_m2 numeric(10,2),
  bedrooms int,
  suites int,
  parking int,
  floor int,
  view text,
  age_years int,
  building_standard building_standard,
  condition conservation,
  amenities jsonb not null default '[]'::jsonb,
  occupancy occupancy not null default 'DESCONHECIDO',
  liquidity_class liquidity_class,
  wood_construction boolean not null default false,
  irregular_construction boolean not null default false,
  atypical_flags jsonb not null default '[]'::jsonb,
  monthly_condo_amount bigint,
  monthly_iptu_amount bigint,
  is_favorite boolean not null default false,
  notes text,
  field_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (group_id, code)
);
create index on properties (group_id, status);
create index on properties (group_id, city, neighborhood);

create table auctions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  source_id uuid references auction_sources(id),
  modality auction_modality not null,
  auctioneer text,
  court_case_number text,
  first_call_at timestamptz,
  first_call_min_bid bigint,
  second_call_at timestamptz,
  second_call_min_bid bigint,
  appraisal_value bigint,            -- fato do edital; NUNCA usado como valor de mercado
  commission_rate numeric(9,6),
  payment_terms jsonb not null default '{}'::jsonb,
  condo_debt_amount bigint,
  iptu_debt_amount bigint,
  debts_responsibility text,
  url text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on auctions (property_id);
create index on auctions (group_id, second_call_at);

-- ---------- Documentos (Fase 2) ----------
create table documents (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  kind document_kind not null,
  storage_path text not null,
  sha256 text not null,
  pages int,
  version int not null default 1,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index on documents (property_id);

create table document_extractions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  field text not null,
  value jsonb,
  page int,
  excerpt text,
  bbox jsonb,
  status extraction_status not null,
  model text,
  prompt_version text,
  run_id uuid,
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on document_extractions (document_id, field);

create table legal_risks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  category risk_category not null,
  fact text not null,
  source_ref jsonb,
  risk text not null,
  impact text,
  recommended_action text,
  confidence int check (confidence between 0 and 100),
  probability int not null check (probability between 1 and 5),
  impact_score int not null check (impact_score between 1 and 5),
  severity int generated always as (probability * impact_score) stored,
  is_critical boolean not null default false,
  mitigation text,
  owner_user_id uuid references users(id),
  status risk_status not null default 'ABERTO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create index on legal_risks (property_id);

-- ---------- Comparáveis e valuation ----------
create table market_comparables (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  source text not null,
  url text,
  captured_at date,
  kind comparable_kind not null default 'LISTING',
  address text,
  distance_m int,
  same_condo boolean,
  same_street boolean,
  same_neighborhood boolean,
  neighborhood text,
  city text,
  type property_type,
  usable_area_m2 numeric(10,2) not null,
  bedrooms int,
  suites int,
  parking int,
  floor int,
  view text,
  age_years int,
  building_standard building_standard,
  condition conservation,
  monthly_condo_amount bigint,
  price_amount bigint not null,
  price_per_m2 numeric(12,2) generated always as (case when usable_area_m2 > 0 then price_amount / 100.0 / usable_area_m2 else null end) stored,
  days_on_market int,
  notes text,
  excluded boolean not null default false,
  excluded_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create index on market_comparables (property_id);
create index on market_comparables (group_id, city, neighborhood, type);

create table valuations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  version int not null,
  method text not null default 'COMPARATIVO_AJUSTADO',
  inputs jsonb not null,
  result jsonb not null,               -- ValuationResult completo (comparáveis avaliados, fatores de confiança, saídas por prazo)
  status valuation_status not null,
  confidence int not null check (confidence between 0 and 100),
  market_value_amount bigint,
  probable_sale_amount bigint,
  exit_horizon_days int not null,
  exit_value_amount bigint,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (property_id, version)
);
create unique index valuations_current on valuations (property_id) where is_current;

-- ---------- Reforma ----------
create table renovation_estimates (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  version int not null,
  level renovation_level not null,
  target_standard building_standard,
  region_factor numeric(6,3) not null default 1,
  low_amount bigint not null,
  likely_amount bigint not null,
  high_amount bigint not null,
  contingency_rate numeric(9,6) not null,
  duration_weeks_low int not null,
  duration_weeks_likely int not null,
  duration_weeks_high int not null,
  requires_professional_quote boolean not null default false,
  result jsonb not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (property_id, version)
);
create unique index renovation_estimates_current on renovation_estimates (property_id) where is_current;

create table renovation_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references renovation_estimates(id) on delete cascade,
  category text not null,
  low_amount bigint not null,
  likely_amount bigint not null,
  high_amount bigint not null,
  basis text not null,
  epistemic_status epistemic_status not null,
  source text,
  notes text
);
create index on renovation_items (estimate_id);

-- Orçamentos reais informados pela analista (substituem a tabela de referência)
create table renovation_overrides (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  category text not null,
  low_amount bigint not null,
  likely_amount bigint not null,
  high_amount bigint not null,
  basis text not null default 'QUOTE',
  source text not null,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (property_id, category)
);

-- ---------- Underwriting, cenários e lance ----------
create table underwritings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  version int not null,
  profile_id uuid references investment_profiles(id),
  valuation_id uuid references valuations(id),
  renovation_estimate_id uuid references renovation_estimates(id),
  reference_bid_amount bigint not null,
  exit_horizon_days int not null,
  months_total int not null,
  inputs jsonb not null,
  outputs jsonb not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (property_id, version)
);
create unique index underwritings_current on underwritings (property_id) where is_current;

create table underwriting_scenarios (
  id uuid primary key default gen_random_uuid(),
  underwriting_id uuid not null references underwritings(id) on delete cascade,
  name text not null,
  assumptions jsonb not null,
  outputs jsonb not null,
  sensitivity jsonb
);

create table max_bid_calculations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  underwriting_id uuid not null references underwritings(id) on delete cascade,
  ideal_amount bigint not null,
  comfortable_amount bigint not null,
  limit_amount bigint not null,
  absolute_max_amount bigint not null,
  binding_constraint text,
  explanation jsonb not null,
  blocked boolean not null default false,
  blocked_reason text,
  override_justification text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

-- Estado de análise por imóvel (escolhas da analista que parametrizam a análise)
create table analysis_settings (
  property_id uuid primary key references properties(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  profile_id uuid references investment_profiles(id),
  renovation_level renovation_level not null default 'MEDIUM',
  exit_horizon_days int,
  reference_bid_amount bigint,
  eviction_months int,
  eviction_cost_amount bigint,
  holding_months int,
  max_bid_override_justification text,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

-- ---------- Decisão ----------
create table investment_decisions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  underwriting_id uuid references underwritings(id),
  version int not null,
  memo_snapshot jsonb not null,        -- memorando congelado
  decision decision_kind not null,
  conditions jsonb not null default '[]'::jsonb,
  decided_at timestamptz not null default now(),
  decided_by uuid references users(id),
  unique (property_id, version)
);

create table investment_votes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  decision_id uuid not null references investment_decisions(id) on delete cascade,
  user_id uuid not null references users(id),
  vote decision_kind not null,
  note text,
  voted_at timestamptz not null default now()
);

create table bid_approvals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  decision_id uuid references investment_decisions(id),
  approved_cap_amount bigint not null,
  approved_by uuid not null references users(id),
  approved_at timestamptz not null default now(),
  valid_until timestamptz not null,
  superseded_by uuid references bid_approvals(id),
  justification text
);
create index on bid_approvals (property_id, approved_at desc);

-- ---------- Projeto, capital e ledger (Fases 3 e 5; estrutura desde já) ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  property_id uuid not null references properties(id),
  decision_id uuid references investment_decisions(id),
  stage project_stage not null default 'ARREMATADO',
  won_bid_amount bigint,
  won_at timestamptz,
  planned_snapshot jsonb,              -- previsto congelado na aprovação (previsto × realizado)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table investor_commitments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  investor_id uuid not null references investors(id),
  kind text not null,
  committed_amount bigint,
  committed_pct numeric(9,6),
  status text not null default 'PENDENTE',
  created_at timestamptz not null default now()
);

create table capital_calls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  sequence int not null,
  total_amount bigint not null,
  due_at date,
  purpose text,
  status text not null default 'ABERTA',
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  project_id uuid not null references projects(id),
  investor_id uuid references investors(id),
  type transaction_type not null,
  category text,
  amount bigint not null,
  currency text not null default 'BRL',
  occurred_at date not null,
  paid_by_investor_id uuid references investors(id),
  evidence_document_id uuid references documents(id),
  description text,
  reverses_transaction_id uuid references transactions(id),
  hash_prev text,
  hash text not null,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create index on transactions (project_id, occurred_at);

create table distributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  project_id uuid not null references projects(id),
  computed_at timestamptz not null default now(),
  basis jsonb not null,
  lines jsonb not null,
  status text not null default 'PROPOSTA',
  created_by uuid references users(id)
);

create table project_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  stage project_stage not null,
  title text not null,
  owner_user_id uuid references users(id),
  due_at date,
  done_at timestamptz,
  blocking boolean not null default false,
  created_at timestamptz not null default now()
);

create table actual_results (
  project_id uuid primary key references projects(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  renovation_actual bigint,
  months_actual numeric(6,2),
  sale_actual bigint,
  cost_actual bigint,
  roi_actual numeric(9,6),
  irr_actual numeric(9,6),
  computed_at timestamptz not null default now()
);

-- ---------- Auditoria e IA ----------
create table audit_logs (
  id bigserial primary key,
  group_id uuid,
  table_name text not null,
  row_id text not null,
  action text not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  old_values jsonb,
  new_values jsonb,
  reason text
);
create index on audit_logs (group_id, changed_at desc);
create index on audit_logs (table_name, row_id);

create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  kind text not null,
  provider text not null,
  model text not null,
  prompt_version text,
  input_hash text,
  output jsonb,
  tokens_in int,
  tokens_out int,
  cost_amount bigint,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

-- ---------- Triggers: auditoria, updated_at, append-only ----------
create or replace function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_group uuid;
  v_row_id text;
begin
  if tg_op = 'DELETE' then
    v_group := (to_jsonb(old) ->> 'group_id')::uuid;
    v_row_id := coalesce(to_jsonb(old) ->> 'id', concat_ws(':', to_jsonb(old) ->> 'group_id', to_jsonb(old) ->> 'user_id', to_jsonb(old) ->> 'property_id'));
    insert into audit_logs (group_id, table_name, row_id, action, changed_by, old_values, new_values)
      values (v_group, tg_table_name, v_row_id, tg_op, auth.uid(), to_jsonb(old), null);
    return old;
  else
    v_group := (to_jsonb(new) ->> 'group_id')::uuid;
    v_row_id := coalesce(to_jsonb(new) ->> 'id', concat_ws(':', to_jsonb(new) ->> 'group_id', to_jsonb(new) ->> 'user_id', to_jsonb(new) ->> 'property_id'));
    insert into audit_logs (group_id, table_name, row_id, action, changed_by, old_values, new_values)
      values (v_group, tg_table_name, v_row_id, tg_op, auth.uid(), case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
    return new;
  end if;
end;
$$;

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

create or replace function deny_mutation() returns trigger language plpgsql as $$
begin raise exception 'Tabela % é append-only: corrija com um novo lançamento', tg_table_name; end; $$;

-- auditoria nas tabelas sensíveis (valuation, lance, custos, retorno, aportes, despesas, distribuições, perfil)
do $$
declare t text;
begin
  foreach t in array array['investment_profiles','properties','auctions','market_comparables','valuations','renovation_estimates','renovation_overrides','underwritings','max_bid_calculations','analysis_settings','investment_decisions','bid_approvals','transactions','distributions','group_members','legal_risks'] loop
    execute format('create trigger audit_%1$s after insert or update or delete on %1$s for each row execute function audit_row()', t);
  end loop;
  foreach t in array array['investment_profiles','properties','auctions','market_comparables','legal_risks','projects'] loop
    execute format('create trigger touch_%1$s before update on %1$s for each row execute function set_updated_at()', t);
  end loop;
  -- append-only
  foreach t in array array['transactions','distributions','investment_votes','bid_approvals','audit_logs'] loop
    execute format('create trigger deny_update_%1$s before update on %1$s for each row execute function deny_mutation()', t);
    execute format('create trigger deny_delete_%1$s before delete on %1$s for each row execute function deny_mutation()', t);
  end loop;
end $$;

-- bid_approvals.superseded_by é a única coluna mutável (marcar substituição) — feita por função dedicada
create or replace function supersede_bid_approval(p_old uuid, p_new uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  alter table bid_approvals disable trigger deny_update_bid_approvals;
  update bid_approvals set superseded_by = p_new where id = p_old and superseded_by is null;
  alter table bid_approvals enable trigger deny_update_bid_approvals;
end; $$;

-- Espelho de auth.users em public.users
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name) values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Código sequencial por grupo
create or replace function next_property_code(p_group uuid) returns int
language sql volatile security definer set search_path = public as $$
  select coalesce(max(code), 0) + 1 from properties where group_id = p_group;
$$;

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array['users','groups','group_members','investors','investment_profiles','auction_sources','properties','auctions','documents','document_extractions','legal_risks','market_comparables','valuations','renovation_estimates','renovation_items','renovation_overrides','underwritings','underwriting_scenarios','max_bid_calculations','analysis_settings','investment_decisions','investment_votes','bid_approvals','projects','investor_commitments','capital_calls','transactions','distributions','project_tasks','actual_results','audit_logs','ai_runs'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- users: cada um vê a si e aos colegas de grupo
create policy users_select on users for select using (
  id = auth.uid() or exists (select 1 from group_members a join group_members b on a.group_id = b.group_id where a.user_id = auth.uid() and b.user_id = users.id)
);
create policy users_update_self on users for update using (id = auth.uid());

create policy groups_select on groups for select using (is_member(id));
create policy groups_update on groups for update using (has_role(id, '{ADMIN}'));

create policy members_select on group_members for select using (is_member(group_id));
create policy members_admin on group_members for all using (has_role(group_id, '{ADMIN}')) with check (has_role(group_id, '{ADMIN}'));

-- Padrão: leitura para membros; escrita conforme papel
create policy investors_select on investors for select using (is_member(group_id));
create policy investors_write on investors for all using (has_role(group_id, '{ADMIN,FINANCEIRO}')) with check (has_role(group_id, '{ADMIN,FINANCEIRO}'));

create policy profiles_select on investment_profiles for select using (is_member(group_id));
create policy profiles_write on investment_profiles for all using (has_role(group_id, '{ADMIN}')) with check (has_role(group_id, '{ADMIN}'));

create policy sources_select on auction_sources for select using (group_id is null or is_member(group_id));
create policy sources_write on auction_sources for all using (has_role(group_id, '{ADMIN,ANALISTA}')) with check (has_role(group_id, '{ADMIN,ANALISTA}'));

do $$
declare t text;
begin
  -- Tabelas de análise: ANALISTA e ADMIN escrevem; todos os membros leem
  foreach t in array array['properties','auctions','market_comparables','valuations','renovation_estimates','renovation_overrides','underwritings','max_bid_calculations','analysis_settings','documents','document_extractions'] loop
    execute format('create policy %1$s_select on %1$s for select using (is_member(group_id))', t);
    execute format('create policy %1$s_write on %1$s for all using (has_role(group_id, ''{ADMIN,ANALISTA}'')) with check (has_role(group_id, ''{ADMIN,ANALISTA}''))', t);
  end loop;
  -- Ledger e financeiro: ADMIN e FINANCEIRO
  foreach t in array array['projects','investor_commitments','capital_calls','transactions','distributions','project_tasks','actual_results'] loop
    execute format('create policy %1$s_select on %1$s for select using (is_member(group_id))', t);
    execute format('create policy %1$s_write on %1$s for all using (has_role(group_id, ''{ADMIN,FINANCEIRO}'')) with check (has_role(group_id, ''{ADMIN,FINANCEIRO}''))', t);
  end loop;
end $$;

-- itens de reforma e cenários herdam do pai
create policy renovation_items_select on renovation_items for select using (exists (select 1 from renovation_estimates e where e.id = estimate_id and is_member(e.group_id)));
create policy renovation_items_write on renovation_items for all using (exists (select 1 from renovation_estimates e where e.id = estimate_id and has_role(e.group_id, '{ADMIN,ANALISTA}')));
create policy scenarios_select on underwriting_scenarios for select using (exists (select 1 from underwritings u where u.id = underwriting_id and is_member(u.group_id)));
create policy scenarios_write on underwriting_scenarios for all using (exists (select 1 from underwritings u where u.id = underwriting_id and has_role(u.group_id, '{ADMIN,ANALISTA}')));

-- riscos: ANALISTA, JURIDICO, ADMIN
create policy risks_select on legal_risks for select using (is_member(group_id));
create policy risks_write on legal_risks for all using (has_role(group_id, '{ADMIN,ANALISTA,JURIDICO}')) with check (has_role(group_id, '{ADMIN,ANALISTA,JURIDICO}'));

-- decisões: registrar por ADMIN/ANALISTA; votos por qualquer membro exceto VISUALIZACAO; teto só ADMIN
create policy decisions_select on investment_decisions for select using (is_member(group_id));
create policy decisions_write on investment_decisions for all using (has_role(group_id, '{ADMIN,ANALISTA}')) with check (has_role(group_id, '{ADMIN,ANALISTA}'));
create policy votes_select on investment_votes for select using (is_member(group_id));
create policy votes_insert on investment_votes for insert with check (user_id = auth.uid() and has_role(group_id, '{ADMIN,ANALISTA,INVESTIDOR,JURIDICO,FINANCEIRO}'));
create policy approvals_select on bid_approvals for select using (is_member(group_id));
create policy approvals_insert on bid_approvals for insert with check (approved_by = auth.uid() and has_role(group_id, '{ADMIN}'));

create policy audit_select on audit_logs for select using (group_id is not null and has_role(group_id, '{ADMIN,FINANCEIRO}'));
create policy ai_runs_select on ai_runs for select using (is_member(group_id));
create policy ai_runs_insert on ai_runs for insert with check (is_member(group_id));
