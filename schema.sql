create table usuarios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text not null unique,
  senha_hash  text not null,
  cargo       int  not null default 1,
  criado_em   timestamptz default now()
);

create index on usuarios (email);

create table configuracao (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null default 'Espaço Fortuna',
  descricao         text,
  localizacao       text,
  endereco          text,
  numero            text,
  whatsapp_admin    text not null,
  area_m2           int,
  capacidade        int,
  quartos           int,
  banheiros         int,
  vagas             int,
  comodidades       text[], 
  fotos             text[],
  atualizado_em     timestamptz default now()
);

insert into configuracao (
  nome, descricao, localizacao, endereco, numero,
  whatsapp_admin, area_m2, capacidade, quartos, banheiros, vagas,
  comodidades
) values (
  'Espaço Fortuna',
  'Espaço de lazer completo para até 30 pessoas, ideal para aniversários e confraternizações.',
  'Salto, SP',
  'Rua das Palmeiras',
  '42',
  '5511999999999',
  320, 30, 3, 2, 6,
  array['Piscina adulto','Piscina infantil','Churrasqueira','Wi-Fi','Mesa de bilhar','Playground','Estacionamento']
);



create table precos (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null unique, 
  label       text not null,
  valor       numeric(10,2) not null,
  atualizado_em timestamptz default now()
);


insert into precos (tipo, label, valor) values
  ('semana',  'Dia de semana',    350.00),
  ('fds',     'Fim de semana',    600.00),
  ('feriado', 'Feriado nacional', 800.00);



create table reservas (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique,   
  chave        text not null,         
  nome         text not null,
  email        text,
  telefone     text,
  data_inicio  date not null,
  data_fim     date not null,
  valor_total  numeric(10,2) not null,
  status       text not null default 'pendente',
  

  contrato          text,
  contrato_assinado boolean default false,
  valor_pago        numeric(10,2) default 0,
  saldo             numeric(10,2) default 0,
  pgto_detalhes     text,

  criado_em    timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index on reservas (token);
create index on reservas (status);



create table datas_bloqueadas (
  id          uuid primary key default gen_random_uuid(),
  data        date not null unique,
  motivo      text default 'bloqueado_admin',
  reserva_id  uuid references reservas(id) on delete set null,
  criado_em   timestamptz default now()
);

create index on datas_bloqueadas (data);

create or replace function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_reservas_atualizado_em
  before update on reservas
  for each row execute function set_atualizado_em();

create trigger trg_precos_atualizado_em
  before update on precos
  for each row execute function set_atualizado_em();

create trigger trg_configuracao_atualizado_em
  before update on configuracao
  for each row execute function set_atualizado_em();

alter table usuarios         enable row level security;
alter table configuracao      enable row level security;
alter table precos            enable row level security;
alter table datas_bloqueadas  enable row level security;
alter table reservas          enable row level security;

create policy "leitura publica configuracao"
  on configuracao for select
  to anon using (true);

create policy "leitura publica precos"
  on precos for select
  to anon using (true);

create policy "leitura publica datas bloqueadas"
  on datas_bloqueadas for select
  to anon using (true);

