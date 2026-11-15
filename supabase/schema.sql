-- =====================================================================
-- CaLa memories · Base de datos completa
-- Pega TODO este archivo en Supabase > SQL Editor > New query > Run.
-- Solo se corre una vez, en un proyecto nuevo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Administradores
--    Solo quien esté en esta tabla puede entrar al panel y modificar datos.
-- ---------------------------------------------------------------------
create table public.admins (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Ajustes del sitio (una sola fila, visible para el público)
-- ---------------------------------------------------------------------
create table public.site_settings (
  id                  int primary key default 1 check (id = 1),
  whatsapp_number     text not null default '',
  hero_title          text not null default 'Recuerdos que se pueden tocar',
  hero_subtitle       text not null default 'Figuras personalizadas, llaveros y regalos impresos en 3D. Los hacemos por encargo y te los llevamos a domicilio.',
  production_min_days int  not null default 2,
  production_max_days int  not null default 5,
  shipping_note       text not null default 'Envío a domicilio en el Valle de Aburrá. El valor del envío se cobra aparte.',
  payment_methods     jsonb not null default '[]'::jsonb,  -- [{label, value, holder}]
  policies            jsonb not null default '[]'::jsonb,  -- [{title, body}]
  instagram_url       text not null default '',
  facebook_url        text not null default '',
  tiktok_url          text not null default '',
  updated_at          timestamptz not null default now()
);

create trigger site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

insert into public.site_settings (id, policies) values (
  1,
  '[
    {"title": "Tiempo de producción", "body": "Cada pedido se fabrica por encargo. El tiempo de producción es de 2 a 5 días hábiles según el pedido, contados desde que recibimos el comprobante de pago."},
    {"title": "Pagos", "body": "Empezamos tu pedido cuando recibimos el comprobante de la transferencia por WhatsApp."},
    {"title": "Pedidos personalizados", "body": "Para figuras personalizadas necesitamos fotos de referencia claras. Te confirmamos los detalles por WhatsApp antes de empezar."}
  ]'::jsonb
);

-- ---------------------------------------------------------------------
-- 3. Catálogo
-- ---------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  slug                     text not null unique,
  short_description        text not null default '',
  description              text not null default '',
  price                    numeric(12, 0) not null default 0,
  price_is_from            boolean not null default false,   -- muestra "Desde $..."
  kind                     text not null default 'estandar'
                           check (kind in ('estandar', 'estandar_personalizado', 'personalizado')),
  is_combo                 boolean not null default false,
  includes                 text[] not null default '{}',     -- qué trae el combo
  variants                 text[] not null default '{}',     -- colores u opciones
  images                   text[] not null default '{}',     -- enlaces de las fotos
  category_id              uuid references public.categories (id) on delete set null,
  published                boolean not null default false,
  featured                 boolean not null default false,
  sort_order               int not null default 0,
  production_min_days      int,                              -- vacío = usa el general
  production_max_days      int,
  -- qué datos exige una orden de este producto
  requires_address         boolean not null default true,
  requires_reference_photo boolean not null default false,
  requires_email           boolean not null default false,
  -- plantilla de pasos de producción (solo interno)
  production_steps         text[] not null default '{}',
  internal_notes           text not null default '',
  created_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index products_published_idx on public.products (published, sort_order);
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Órdenes (fase 2)
-- ---------------------------------------------------------------------
create table public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_number            bigint generated always as identity,
  product_id              uuid references public.products (id) on delete set null,
  product_name            text not null,
  kind                    text not null default 'estandar'
                          check (kind in ('estandar', 'estandar_personalizado', 'personalizado')),
  variant                 text not null default '',
  quantity                int not null default 1,
  customer_name           text not null,
  customer_phone          text not null default '',
  customer_email          text not null default '',
  address                 text not null default '',
  city                    text not null default '',
  notes                   text not null default '',
  reference_images        text[] not null default '{}',
  total_price             numeric(12, 0) not null default 0,
  shipping_fee            numeric(12, 0) not null default 0,
  paid                    boolean not null default false,
  paid_at                 timestamptz,
  payment_method          text not null default '',
  produce_without_payment boolean not null default false,  -- familia y conocidos
  status                  text not null default 'nueva'
                          check (status in ('nueva', 'confirmada', 'en_produccion', 'lista', 'entregada', 'cancelada')),
  assigned_to             uuid references auth.users (id) on delete set null,
  due_date                date,
  delivered_at            timestamptz,
  created_by              uuid references auth.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_steps (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references public.orders (id) on delete cascade,
  position  int  not null,
  name      text not null,
  done      boolean not null default false,
  done_at   timestamptz,
  done_by   uuid references auth.users (id) on delete set null
);
create index order_steps_order_idx on public.order_steps (order_id, position);

create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  note       text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- ---------------------------------------------------------------------
-- 5. Tareas por usuario (fase 2)
-- ---------------------------------------------------------------------
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  details     text not null default '',
  assigned_to uuid references auth.users (id) on delete set null,
  due_date    date,
  done        boolean not null default false,
  done_at     timestamptz,
  order_id    uuid references public.orders (id) on delete set null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Inventario y cotizador (fase 3)
-- ---------------------------------------------------------------------
create table public.supplies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null default 'filamento'
                check (type in ('filamento', 'pintura', 'embalaje', 'otro')),
  color         text not null default '',
  unit          text not null default 'g' check (unit in ('g', 'ml', 'unidad')),
  stock_qty     numeric(12, 2) not null default 0,
  avg_unit_cost numeric(12, 4) not null default 0,   -- costo promedio por unidad
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.supply_purchases (
  id           uuid primary key default gen_random_uuid(),
  supply_id    uuid not null references public.supplies (id) on delete cascade,
  qty          numeric(12, 2) not null,
  total_cost   numeric(12, 0) not null,
  purchased_at date not null default current_date,
  note         text not null default '',
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.supply_movements (
  id         uuid primary key default gen_random_uuid(),
  supply_id  uuid not null references public.supplies (id) on delete cascade,
  order_id   uuid references public.orders (id) on delete set null,
  qty        numeric(12, 2) not null,              -- negativo = salida
  reason     text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.cost_settings (
  id            int primary key default 1 check (id = 1),
  labor_rate    numeric(12, 0) not null default 0,     -- valor de la hora de trabajo
  kwh_price     numeric(12, 2) not null default 0,     -- tarifa de energía por kWh
  printer_watts numeric(8, 2)  not null default 0,     -- consumo promedio de la impresora
  wear_pct      numeric(5, 2)  not null default 5,     -- desgaste de máquina
  waste_pct     numeric(5, 2)  not null default 10,    -- merma
  packaging_fee numeric(12, 0) not null default 0,     -- embalaje fijo
  updated_at    timestamptz not null default now()
);
insert into public.cost_settings (id) values (1);

create table public.quotes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  product_id      uuid references public.products (id) on delete set null,
  order_id        uuid references public.orders (id) on delete set null,
  inputs          jsonb not null default '{}'::jsonb,
  cost_total      numeric(12, 0) not null default 0,
  suggested_price numeric(12, 0) not null default 0,
  final_price     numeric(12, 0) not null default 0,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. Lanzamientos y contenido (fase 4)
-- ---------------------------------------------------------------------
create table public.launches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  target_date date,
  status      text not null default 'idea'
              check (status in ('idea', 'en_desarrollo', 'listo', 'lanzado')),
  media_links jsonb not null default '[]'::jsonb,   -- [{label, url}]
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.content_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  platforms     text[] not null default '{}',       -- instagram, tiktok, facebook
  format        text not null default 'video',      -- video, short, publicacion, historia
  status        text not null default 'idea'
                check (status in ('idea', 'pendiente', 'programado', 'publicado')),
  scheduled_for timestamptz,
  launch_id     uuid references public.launches (id) on delete set null,
  product_id    uuid references public.products (id) on delete set null,
  media_link    text not null default '',
  notes         text not null default '',
  assigned_to   uuid references auth.users (id) on delete set null,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- =====================================================================
-- SEGURIDAD
-- =====================================================================

-- El público (sin sesión) no puede tocar nada, salvo leer lo indicado abajo.
revoke all on all tables in schema public from anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Lo único que el público puede leer:
grant select on public.site_settings to anon;
grant select on public.categories    to anon;
-- De productos, solo las columnas públicas (sin notas internas ni pasos).
grant select (
  id, name, slug, short_description, description, price, price_is_from, kind,
  is_combo, includes, variants, images, category_id, published, featured,
  sort_order, production_min_days, production_max_days,
  requires_reference_photo, created_at
) on public.products to anon;

alter table public.admins           enable row level security;
alter table public.site_settings    enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.orders           enable row level security;
alter table public.order_steps      enable row level security;
alter table public.order_events     enable row level security;
alter table public.tasks            enable row level security;
alter table public.supplies         enable row level security;
alter table public.supply_purchases enable row level security;
alter table public.supply_movements enable row level security;
alter table public.cost_settings    enable row level security;
alter table public.quotes           enable row level security;
alter table public.launches         enable row level security;
alter table public.content_items    enable row level security;

-- Lectura pública
create policy "publico lee ajustes"    on public.site_settings for select using (true);
create policy "publico lee categorias" on public.categories    for select using (true);
create policy "publico lee publicados" on public.products      for select using (published = true);

-- Los administradores pueden todo
create policy "admin todo" on public.admins           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.site_settings    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.categories       for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.products         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.orders           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.order_steps      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.order_events     for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.tasks            for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.supplies         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.supply_purchases for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.supply_movements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.cost_settings    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.quotes           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.launches         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo" on public.content_items    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- ALMACENAMIENTO DE FOTOS
-- "productos": fotos del catálogo, cualquiera puede verlas por su enlace.
-- "referencias": fotos que mandan los clientes, solo las ven los admins.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true), ('referencias', 'referencias', false)
on conflict (id) do nothing;

create policy "cala admin lee fotos" on storage.objects for select to authenticated
  using (bucket_id in ('productos', 'referencias') and public.is_admin());
create policy "cala admin sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id in ('productos', 'referencias') and public.is_admin());
create policy "cala admin edita fotos" on storage.objects for update to authenticated
  using (bucket_id in ('productos', 'referencias') and public.is_admin());
create policy "cala admin borra fotos" on storage.objects for delete to authenticated
  using (bucket_id in ('productos', 'referencias') and public.is_admin());

-- =====================================================================
-- DATOS INICIALES (puedes cambiarlos luego desde el panel)
-- =====================================================================
insert into public.categories (name, slug, sort_order) values
  ('Figuras personalizadas', 'figuras-personalizadas', 1),
  ('Llaveros', 'llaveros', 2),
  ('Decoración', 'decoracion', 3),
  ('Combos', 'combos', 4);
