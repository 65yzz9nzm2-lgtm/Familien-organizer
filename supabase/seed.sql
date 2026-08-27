-- Demo data for LOCAL DEVELOPMENT ONLY (supabase start / supabase db reset).
-- Never run this against a production project - it inserts fake auth users
-- with a throwaway password so the app has something to look at out of the box.
--
-- Login for all demo accounts: password "FamilyHub123!"
-- thomas.mueller@familyhub.demo (Admin) / sarah.mueller@familyhub.demo (Elternteil)
-- max.mueller@familyhub.demo (Kind) / emma.mueller@familyhub.demo (Kind)

do $$
declare
  v_thomas uuid := 'a0000000-0000-4000-8000-000000000001';
  v_sarah  uuid := 'a0000000-0000-4000-8000-000000000002';
  v_max    uuid := 'a0000000-0000-4000-8000-000000000003';
  v_emma   uuid := 'a0000000-0000-4000-8000-000000000004';
  v_family uuid := 'b0000000-0000-4000-8000-000000000001';
  v_cat_wohnen uuid;
  v_cat_lebensmittel uuid;
  v_cat_auto uuid;
  v_cat_freizeit uuid;
  v_recipe_bolognese uuid;
  v_recipe_tacos uuid;
  v_list uuid;
  v_goal uuid;
  v_encrypted_pw text := crypt('FamilyHub123!', gen_salt('bf'));
begin
  -- Demo auth users -----------------------------------------------------
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_thomas, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thomas.mueller@familyhub.demo', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Thomas Müller"}', now(), now()),
    (v_sarah, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.mueller@familyhub.demo', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sarah Müller"}', now(), now()),
    (v_max, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'max.mueller@familyhub.demo', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Max Müller"}', now(), now()),
    (v_emma, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emma.mueller@familyhub.demo', v_encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Emma Müller"}', now(), now())
  on conflict (id) do nothing;

  -- Family ---------------------------------------------------------------
  insert into public.families (id, name, color, country, currency, created_by)
  values (v_family, 'Familie Müller', '#6366f1', 'DE', 'EUR', v_thomas)
  on conflict (id) do nothing;

  insert into public.family_members (family_id, user_id, role, display_name, color)
  values
    (v_family, v_thomas, 'admin', 'Thomas', '#6366f1'),
    (v_family, v_sarah, 'parent', 'Sarah', '#ec4899'),
    (v_family, v_max, 'child', 'Max', '#22c55e'),
    (v_family, v_emma, 'child', 'Emma', '#f97316')
  on conflict do nothing;

  -- Finances ---------------------------------------------------------------
  select id into v_cat_wohnen from public.expense_categories where name = 'Wohnen' and family_id is null;
  select id into v_cat_lebensmittel from public.expense_categories where name = 'Lebensmittel' and family_id is null;
  select id into v_cat_auto from public.expense_categories where name = 'Auto' and family_id is null;
  select id into v_cat_freizeit from public.expense_categories where name = 'Freizeit' and family_id is null;

  insert into public.income (family_id, source_type, amount_cents, occurred_on, received_by, owner_id, note) values
    (v_family, 'salary', 380000, date_trunc('month', current_date), v_thomas, v_thomas, 'Gehalt Thomas'),
    (v_family, 'salary', 140000, date_trunc('month', current_date), v_sarah, v_sarah, 'Gehalt Sarah'),
    (v_family, 'child_benefit', 25000, date_trunc('month', current_date), v_sarah, v_sarah, 'Kindergeld');

  insert into public.expenses (family_id, category_id, amount_cents, occurred_on, paid_by, owner_id, note) values
    (v_family, v_cat_lebensmittel, 4870, current_date - 2, v_sarah, v_sarah, 'Supermarkt'),
    (v_family, v_cat_wohnen, 120000, date_trunc('month', current_date), v_thomas, v_thomas, 'Miete'),
    (v_family, v_cat_auto, 6500, current_date - 5, v_thomas, v_thomas, 'Tanken'),
    (v_family, v_cat_freizeit, 3200, current_date - 1, v_sarah, v_sarah, 'Kino');

  insert into public.recurring_expenses (family_id, category_id, name, amount_cents, interval, next_due_date, created_by) values
    (v_family, v_cat_auto, 'Autoversicherung', 78000, 'annual', date_trunc('year', current_date) + interval '2 months' + interval '14 days', v_thomas),
    (v_family, v_cat_wohnen, 'Internet', 4500, 'monthly', current_date + interval '1 month', v_thomas),
    (v_family, v_cat_wohnen, 'Kfz-Steuer', 24000, 'annual', current_date + interval '4 months', v_thomas);

  -- Calendar -----------------------------------------------------------------
  insert into public.calendar_events (family_id, title, event_type, start_at, end_at, owner_id, created_by) values
    (v_family, 'Schule', 'school', current_date + time '08:00', current_date + time '13:00', v_max, v_sarah),
    (v_family, 'Fußballtraining', 'sport', current_date + time '16:00', current_date + time '17:30', v_max, v_sarah),
    (v_family, 'Arzttermin Emma', 'doctor', current_date + interval '2 days' + time '10:00', current_date + interval '2 days' + time '11:00', v_emma, v_sarah),
    (v_family, 'Familienessen', 'family', current_date + time '19:00', current_date + time '20:00', v_thomas, v_thomas);

  -- Recipes + weekly plan ------------------------------------------------
  insert into public.recipes (id, family_id, name, ingredients, prep_minutes, servings, category, is_favorite, created_by) values
    (gen_random_uuid(), v_family, 'Spaghetti Bolognese',
      '[{"name":"Spaghetti","quantity":500,"unit":"g"},{"name":"Hackfleisch","quantity":400,"unit":"g"},{"name":"Tomaten","quantity":4,"unit":"Stück"},{"name":"Zwiebel","quantity":1,"unit":"Stück"}]',
      35, 4, 'Pasta', true, v_sarah)
    returning id into v_recipe_bolognese;

  insert into public.recipes (id, family_id, name, ingredients, prep_minutes, servings, category, created_by) values
    (gen_random_uuid(), v_family, 'Tacos',
      '[{"name":"Tortillas","quantity":8,"unit":"Stück"},{"name":"Hackfleisch","quantity":300,"unit":"g"},{"name":"Tomaten","quantity":3,"unit":"Stück"},{"name":"Salat","quantity":1,"unit":"Kopf"}]',
      25, 4, 'Mexikanisch', v_sarah)
    returning id into v_recipe_tacos;

  insert into public.recipes (family_id, name, prep_minutes, servings, category, created_by) values
    (v_family, 'Pizza', 40, 4, 'Italienisch', v_thomas),
    (v_family, 'Curry', 30, 4, 'Asiatisch', v_sarah),
    (v_family, 'Lasagne', 60, 6, 'Italienisch', v_thomas);

  insert into public.meals (family_id, recipe_id, planned_on, meal_type, created_by) values
    (v_family, v_recipe_bolognese, current_date, 'dinner', v_sarah),
    (v_family, v_recipe_tacos, current_date + interval '1 day', 'dinner', v_sarah);

  -- Shopping list + pantry -------------------------------------------------
  insert into public.shopping_lists (id, family_id, created_by) values (gen_random_uuid(), v_family, v_sarah)
    returning id into v_list;

  insert into public.shopping_items (list_id, name, quantity, unit, category) values
    (v_list, 'Tomaten', 9, 'Stück', 'Obst & Gemüse'),
    (v_list, 'Milch', 2, 'Liter', 'Milchprodukte'),
    (v_list, 'Hackfleisch', 700, 'g', 'Fleisch');

  insert into public.pantry_items (family_id, name, quantity, unit, category) values
    (v_family, 'Nudeln', 3, 'Packungen', 'Vorräte'),
    (v_family, 'Milch', 2, 'Liter', 'Milchprodukte'),
    (v_family, 'Tomatensoße', 4, 'Gläser', 'Vorräte');

  -- Tasks + rewards -----------------------------------------------------
  insert into public.tasks (family_id, title, recurrence_rule, priority, points, category, created_by) values
    (v_family, 'Müll rausbringen', 'weekly:wed', 'medium', 5, 'Haushalt', v_thomas),
    (v_family, 'Zimmer aufräumen', 'weekly:sat', 'low', 10, 'Haushalt', v_sarah),
    (v_family, 'Hund füttern', 'weekly:sat', 'medium', 10, 'Haustiere', v_sarah),
    (v_family, 'Einkaufen', 'weekly:sat', 'medium', 8, 'Haushalt', v_sarah);

  insert into public.rewards (family_id, title, points_cost, created_by) values
    (v_family, 'Kino-Abend', 50, v_sarah),
    (v_family, '1 Stunde extra Bildschirmzeit', 20, v_sarah);

  -- Goals + birthdays -----------------------------------------------------
  insert into public.goals (id, family_id, title, target_amount_cents, target_date, created_by) values
    (gen_random_uuid(), v_family, 'Urlaub 2027', 400000, '2027-07-01', v_thomas)
    returning id into v_goal;

  insert into public.goal_transactions (goal_id, amount_cents, note, created_by) values
    (v_goal, 100000, 'Anfangssparbetrag', v_thomas),
    (v_goal, 85000, 'Monatliche Rücklage', v_sarah);

  insert into public.birthdays (family_id, name, date_of_birth, created_by) values
    (v_family, 'Max', '2015-04-12', v_sarah),
    (v_family, 'Emma', '2017-09-03', v_sarah);
end $$;
