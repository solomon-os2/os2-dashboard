-- Portal-only customer messages (not posted to Trello).
-- Staff replies stay on Trello cards with the CUSTOMER · prefix.

create table if not exists public.portal_messages (
  id uuid primary key default gen_random_uuid(),
  card_id text not null,
  board_id text not null,
  customer_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

comment on table public.portal_messages is
  'Customer messages sent via the portal; staff are notified by email';

create index if not exists portal_messages_card_id_idx
  on public.portal_messages (card_id);

create index if not exists portal_messages_board_card_idx
  on public.portal_messages (board_id, card_id);

alter table public.portal_messages enable row level security;
