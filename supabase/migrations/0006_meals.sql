-- Recipes, weekly meal plan, shopping lists/items, pantry.

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  image_url text,
  ingredients jsonb not null default '[]', -- [{ "name": "Tomaten", "quantity": 2, "unit": "Stück" }]
  instructions text,
  prep_minutes integer check (prep_minutes >= 0),
  servings integer not null default 4 check (servings > 0),
  category text default 'Sonstiges',
  is_favorite boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create index recipes_family_id_idx on public.recipes (family_id);

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete set null,
  custom_title text,
  planned_on date not null,
  meal_type public.meal_type not null default 'dinner',
  servings integer check (servings > 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check (recipe_id is not null or custom_title is not null)
);

create index meals_family_id_idx on public.meals (family_id, planned_on);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null default 'Einkaufsliste',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  name text not null,
  quantity numeric(10, 2) default 1,
  unit text default 'Stück',
  category text not null default 'Sonstiges',
  is_checked boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'recipe')),
  created_at timestamptz not null default now()
);

create index shopping_items_list_id_idx on public.shopping_items (list_id);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  quantity numeric(10, 2) not null default 0,
  unit text not null default 'Stück',
  category text not null default 'Sonstiges',
  updated_at timestamptz not null default now(),
  unique (family_id, name)
);

create trigger pantry_items_set_updated_at
  before update on public.pantry_items
  for each row execute function public.set_updated_at();

-- RLS ---------------------------------------------------------------------
alter table public.recipes enable row level security;
alter table public.meals enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.pantry_items enable row level security;

create policy "recipes_all_members" on public.recipes
  for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "meals_all_members" on public.meals
  for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "shopping_lists_all_members" on public.shopping_lists
  for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "shopping_items_select" on public.shopping_items
  for select using (
    exists (select 1 from public.shopping_lists l where l.id = list_id and public.is_family_member(l.family_id))
  );

create policy "shopping_items_write" on public.shopping_items
  for all using (
    exists (select 1 from public.shopping_lists l where l.id = list_id and public.is_family_member(l.family_id))
  ) with check (
    exists (select 1 from public.shopping_lists l where l.id = list_id and public.is_family_member(l.family_id))
  );

create policy "pantry_items_all_members" on public.pantry_items
  for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));
