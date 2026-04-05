-- Forja — parte 2/2: RLS + políticas (correr DEPOIS de forja_schema_01_tables.sql)
-- Seguro para reexecutar: remove políticas com o mesmo nome antes de criar.

-- ============ RLS ============
alter table public.forja_user_profiles enable row level security;
alter table public.forja_habits enable row level security;
alter table public.forja_habit_completions enable row level security;
alter table public.forja_tasks enable row level security;
alter table public.forja_goals enable row level security;
alter table public.forja_transactions enable row level security;
alter table public.forja_financial_cards enable row level security;
alter table public.forja_bank_accounts enable row level security;
alter table public.forja_shopping_items enable row level security;
alter table public.forja_budget_rules enable row level security;
alter table public.forja_finance_notes enable row level security;
alter table public.forja_focus_projects enable row level security;
alter table public.forja_focus_sessions enable row level security;
alter table public.forja_water_logs enable row level security;
alter table public.forja_app_notifications enable row level security;
alter table public.forja_push_subscriptions enable row level security;
alter table public.forja_user_achievements enable row level security;
alter table public.forja_featured_achievements enable row level security;

drop policy if exists forja_user_profiles_own on public.forja_user_profiles;
drop policy if exists forja_habits_own on public.forja_habits;
drop policy if exists forja_habit_completions_own on public.forja_habit_completions;
drop policy if exists forja_tasks_own on public.forja_tasks;
drop policy if exists forja_goals_own on public.forja_goals;
drop policy if exists forja_transactions_own on public.forja_transactions;
drop policy if exists forja_financial_cards_own on public.forja_financial_cards;
drop policy if exists forja_bank_accounts_own on public.forja_bank_accounts;
drop policy if exists forja_shopping_items_own on public.forja_shopping_items;
drop policy if exists forja_budget_rules_own on public.forja_budget_rules;
drop policy if exists forja_finance_notes_own on public.forja_finance_notes;
drop policy if exists forja_focus_projects_own on public.forja_focus_projects;
drop policy if exists forja_focus_sessions_own on public.forja_focus_sessions;
drop policy if exists forja_water_logs_own on public.forja_water_logs;
drop policy if exists forja_app_notifications_own on public.forja_app_notifications;
drop policy if exists forja_push_subscriptions_own on public.forja_push_subscriptions;
drop policy if exists forja_user_achievements_own on public.forja_user_achievements;
drop policy if exists forja_featured_achievements_own on public.forja_featured_achievements;

create policy forja_user_profiles_own on public.forja_user_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_habits_own on public.forja_habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_habit_completions_own on public.forja_habit_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_tasks_own on public.forja_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_goals_own on public.forja_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_transactions_own on public.forja_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_financial_cards_own on public.forja_financial_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_bank_accounts_own on public.forja_bank_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_shopping_items_own on public.forja_shopping_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_budget_rules_own on public.forja_budget_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_finance_notes_own on public.forja_finance_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_focus_projects_own on public.forja_focus_projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_focus_sessions_own on public.forja_focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_water_logs_own on public.forja_water_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_app_notifications_own on public.forja_app_notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_push_subscriptions_own on public.forja_push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_user_achievements_own on public.forja_user_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy forja_featured_achievements_own on public.forja_featured_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
