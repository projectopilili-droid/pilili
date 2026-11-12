-- PILILÍ core schema. Per-user rows are always scoped by user_id (TEXT).

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  plan text not null default 'trial',
  credits integer not null default 40,
  locale text not null default 'pt-AO',
  low_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memory_facts (
  id serial primary key,
  user_id text not null,
  kind text not null default 'preference',
  key text not null,
  value text not null,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists memory_facts_user_id_idx on memory_facts (user_id);

create table if not exists projects (
  id text primary key,
  user_id text not null,
  title text not null,
  kind text not null default 'geral',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on projects (user_id);

create table if not exists conversations (
  id text primary key,
  user_id text not null,
  project_id text,
  power text,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_id_idx on conversations (user_id);
create index if not exists conversations_project_id_idx on conversations (project_id);

create table if not exists messages (
  id text primary key,
  conversation_id text not null,
  user_id text not null,
  role text not null,
  content text not null,
  artifacts_json text,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_id_idx on messages (conversation_id);

create table if not exists library_items (
  id text primary key,
  user_id text not null,
  project_id text,
  conversation_id text,
  kind text not null,
  title text not null,
  mime text,
  body text,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists library_items_user_id_idx on library_items (user_id);

create table if not exists credit_ledger (
  id text primary key,
  user_id text not null,
  amount integer not null,
  reason text not null,
  idempotency_key text not null,
  meta text,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index if not exists credit_ledger_user_id_idx on credit_ledger (user_id);
