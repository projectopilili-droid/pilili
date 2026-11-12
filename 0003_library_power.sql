alter table library_items add column if not exists power text;
create index if not exists library_items_user_power_idx on library_items (user_id, power);
