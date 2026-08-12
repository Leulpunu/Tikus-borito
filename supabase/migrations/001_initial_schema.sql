-- Tikus Borito production schema. Run with `supabase db push` or in the Supabase SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text not null check (role in ('Manager', 'Waiter', 'Kitchen', 'Cashier')),
  area text not null default 'Operations',
  email text not null,
  initials text,
  color text,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_idx on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  profile_role text;
  profile_name text;
begin
  profile_role := case
    when new.raw_user_meta_data ->> 'role' in ('Manager', 'Waiter', 'Kitchen', 'Cashier')
      then new.raw_user_meta_data ->> 'role'
    else 'Waiter'
  end;
  profile_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));
  insert into public.profiles (id, name, role, area, email, initials)
  values (
    new.id,
    profile_name,
    profile_role,
    profile_role,
    coalesce(new.email, ''),
    upper(left(profile_name, 2))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (char_length(category) between 1 and 40),
  image text not null default '/images/default.svg',
  unit_price numeric(12,2) not null check (unit_price > 0),
  stock integer not null check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'Confirmed' check (status in ('Confirmed', 'Preparing', 'Ready', 'Served', 'Cancelled')),
  payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid')),
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_product_id_idx on public.orders (product_id);

create table if not exists public.notes (
  id text primary key,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  role text not null check (role in ('Manager', 'Waiter', 'Kitchen', 'Cashier')),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists notes_created_at_idx on public.notes (created_at desc);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.notes enable row level security;

-- The web app accesses business tables only through authenticated server routes.
-- With no client policies, RLS denies direct browser writes; the server's service role bypasses RLS.

create or replace function public.create_order_transaction(
  p_order_id text,
  p_customer_name text,
  p_product_id text,
  p_quantity integer
)
returns setof public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_product public.products%rowtype;
  created_order public.orders%rowtype;
begin
  if char_length(trim(p_customer_name)) not between 1 and 80 then
    raise exception 'Customer name is required.';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be a positive whole number.';
  end if;

  select * into selected_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found.'; end if;
  if selected_product.stock < p_quantity then
    raise exception 'Only % unit(s) are available.', selected_product.stock;
  end if;

  update public.products
    set stock = stock - p_quantity, updated_at = now()
    where id = p_product_id;

  insert into public.orders (id, customer_name, product_id, product_name, quantity, total)
  values (
    p_order_id,
    trim(p_customer_name),
    selected_product.id,
    selected_product.name,
    p_quantity,
    round(selected_product.unit_price * p_quantity, 2)
  )
  returning * into created_order;
  return next created_order;
end;
$$;

create or replace function public.update_order_transaction(
  p_order_id text,
  p_status text default null,
  p_payment_status text default null
)
returns setof public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_order public.orders%rowtype;
begin
  select * into selected_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if selected_order.status = 'Cancelled' then raise exception 'A cancelled order cannot be updated.'; end if;

  if p_status is not null then
    if not (
      (selected_order.status = 'Confirmed' and p_status = 'Preparing') or
      (selected_order.status = 'Preparing' and p_status = 'Ready') or
      (selected_order.status = 'Ready' and p_status = 'Served')
    ) then raise exception 'Invalid order status transition.'; end if;
    selected_order.status := p_status;
  end if;

  if p_payment_status is not null then
    if p_payment_status not in ('Pending', 'Paid') then raise exception 'Invalid payment status.'; end if;
    selected_order.payment_status := p_payment_status;
  end if;

  update public.orders set
    status = selected_order.status,
    payment_status = selected_order.payment_status
  where id = p_order_id
  returning * into selected_order;
  return next selected_order;
end;
$$;

create or replace function public.cancel_order_transaction(p_order_id text)
returns setof public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_order public.orders%rowtype;
begin
  select * into selected_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if selected_order.status = 'Cancelled' then return next selected_order; return; end if;
  if selected_order.payment_status = 'Paid' then raise exception 'Refund a paid order before cancelling it.'; end if;
  if selected_order.status = 'Served' then raise exception 'A served order cannot be cancelled.'; end if;

  update public.products
    set stock = stock + selected_order.quantity, updated_at = now()
    where id = selected_order.product_id;
  update public.orders set status = 'Cancelled' where id = p_order_id returning * into selected_order;
  return next selected_order;
end;
$$;

revoke execute on function public.create_order_transaction(text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.update_order_transaction(text, text, text) from public, anon, authenticated;
revoke execute on function public.cancel_order_transaction(text) from public, anon, authenticated;
grant execute on function public.create_order_transaction(text, text, text, integer) to service_role;
grant execute on function public.update_order_transaction(text, text, text) to service_role;
grant execute on function public.cancel_order_transaction(text) to service_role;

insert into public.products (id, name, category, image, unit_price, stock) values
  ('prod-burrito', 'Burrito', 'Wraps', '/images/wraps.svg', 450, 20),
  ('prod-chicken-wrap', 'Chicken Wrap', 'Wraps', '/images/wraps.svg', 400, 25),
  ('prod-tuna-wrap', 'Tuna Wrap', 'Wraps', '/images/wraps.svg', 400, 18),
  ('prod-beef-wrap', 'Beef Wrap', 'Wraps', '/images/wraps.svg', 400, 15),
  ('prod-club-wrap', 'Club Wrap', 'Wraps', '/images/wraps.svg', 400, 12),
  ('prod-club-sandwich', 'Club Sandwich', 'Sandwiches', '/images/sandwiches.svg', 450, 10),
  ('prod-pita-special', 'Pita Special', 'Sandwiches', '/images/sandwiches.svg', 350, 20),
  ('prod-pita-normal', 'Pita Normal', 'Sandwiches', '/images/sandwiches.svg', 250, 30),
  ('prod-omelette', 'Omelette', 'Breakfast', '/images/breakfast.svg', 300, 22),
  ('prod-shakshuka', 'Shakshuka', 'Breakfast', '/images/breakfast.svg', 300, 16),
  ('prod-cheese-beef-samosa', 'Cheese Beef Samosa (3 pcs)', 'Samosas', '/images/samosas.svg', 250, 40),
  ('prod-fasting-wrap', 'Fasting Wrap', 'Wraps', '/images/wraps.svg', 300, 20),
  ('prod-tea', 'Tea', 'Drinks', '/images/drinks.svg', 60, 80),
  ('prod-coffee', 'Coffee', 'Drinks', '/images/drinks.svg', 90, 60),
  ('prod-sprite', 'Sprite', 'Drinks', '/images/drinks.svg', 60, 70),
  ('prod-milk', 'Milk', 'Drinks', '/images/drinks.svg', 90, 50),
  ('prod-biscuit', 'Biscuit', 'Snacks', '/images/snacks.svg', 40, 100),
  ('prod-bonbolino', 'Bonbolino', 'Snacks', '/images/snacks.svg', 35, 90),
  ('prod-macchiato', 'Macchiato', 'Snacks', '/images/snacks.svg', 85, 55)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public product image reads" on storage.objects;
create policy "Public product image reads" on storage.objects
for select using (bucket_id = 'product-images');
