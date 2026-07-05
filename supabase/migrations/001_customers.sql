-- Portal customer accounts (login by customer name or slug + PIN).
-- match_value: canonical name from Trello "Customer - {name}" label (blue_dark).
-- customer_id: uppercase slug derived from customer name (optional login alias).
-- board_id: Trello board short link when the account is created.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  display_name text not null,
  pin_hash text,
  match_value text not null,
  board_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customers is
  'Portal login accounts scoped per Trello board and customer label';

comment on column public.customers.match_value is
  'Canonical customer name from Trello Customer - label; unique per board';

comment on column public.customers.customer_id is
  'Uppercase slug derived from customer name; optional login alias';

comment on column public.customers.display_name is
  'Human-readable customer name shown in the portal';

comment on column public.customers.pin_hash is
  'Bcrypt hash of the customer PIN; null until staff generates a PIN';

create index if not exists customers_customer_id_idx on public.customers (customer_id);
create index if not exists customers_board_id_idx on public.customers (board_id);

create unique index if not exists customers_board_match_unique_idx
  on public.customers (board_id, lower(match_value));

create unique index if not exists customers_board_customer_unique_idx
  on public.customers (board_id, customer_id);

alter table public.customers enable row level security;
