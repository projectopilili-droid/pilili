create table if not exists feedback (
  id text primary key,
  user_id text,
  body text not null,
  path text,
  created_at timestamptz not null default now()
);
