create table if not exists spotify_accounts (
  user_id text primary key,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

create table if not exists spotify_states (
  state text primary key,
  user_id text not null,
  created_at timestamptz not null default now()
);
