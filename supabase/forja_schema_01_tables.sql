-- Forja — parte 1/2: apenas tabelas e índices (correr primeiro se forja_schema.sql der timeout)
-- Ver comentário no topo de forja_schema.sql para dicas (reinício DB, fechar dev server).

-- ============ Perfil / gamificação ============
create table if not exists public.forja_user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  xp integer not null default 0,
  coins integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  water_ml integer not null default 0,
  water_goal_ml integer not null default 2000,
  sleep_rating varchar(20),
  energy_rating varchar(20),
  humor_rating varchar(20),
  focus_hours_goal integer not null default 40,
  notify_habits boolean not null default true,
  notify_metas boolean not null default true,
  notify_community boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============ Hábitos ============
create table if not exists public.forja_habits (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name varchar(255) not null,
  icon varchar(10) not null default '💪',
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'custom')),
  daily_goal integer not null default 1,
  custom_days jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists forja_habits_user_id_idx on public.forja_habits (user_id);

create table if not exists public.forja_habit_completions (
  id bigserial primary key,
  habit_id bigint not null references public.forja_habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date varchar(10) not null,
  count integer not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists forja_habit_completions_user_date_idx on public.forja_habit_completions (user_id, date);

-- ============ Tarefas Forja ============
create table if not exists public.forja_tasks (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title varchar(500) not null,
  description text,
  date varchar(10) not null,
  time varchar(5),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  is_completed boolean not null default false,
  is_recurring boolean not null default false,
  recurring_days jsonb,
  xp_reward integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists forja_tasks_user_id_idx on public.forja_tasks (user_id);
create index if not exists forja_tasks_user_date_idx on public.forja_tasks (user_id, date);

-- ============ Metas ============
create table if not exists public.forja_goals (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title varchar(500) not null,
  description text,
  category varchar(100),
  icon varchar(10) not null default '🎯',
  deadline varchar(10),
  status text not null default 'active' check (status in ('active', 'completed', 'paused')),
  progress integer not null default 0,
  milestones jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists forja_goals_user_id_idx on public.forja_goals (user_id);

-- ============ Finanças ============
create table if not exists public.forja_transactions (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title varchar(500) not null,
  amount double precision not null,
  type text not null check (type in ('income', 'expense')),
  category varchar(100) not null default 'Outros',
  date varchar(10) not null,
  month integer not null,
  year integer not null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists forja_transactions_user_year_month_idx on public.forja_transactions (user_id, year, month);

create table if not exists public.forja_financial_cards (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name varchar(255) not null,
  brand varchar(50) not null default 'Visa',
  type text not null default 'credit' check (type in ('credit', 'debit')),
  last_digits varchar(4),
  card_limit double precision default 0,
  closing_day integer default 1,
  due_day integer default 10,
  color varchar(20) not null default '#EF4444',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.forja_bank_accounts (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name varchar(255) not null,
  type text not null default 'checking' check (type in ('checking', 'savings', 'investment', 'wallet')),
  balance double precision not null default 0,
  icon varchar(10) not null default '🏦',
  color varchar(20) not null default '#3B82F6',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forja_shopping_items (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name varchar(500) not null,
  estimated_price double precision,
  category varchar(100),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'bought', 'cancelled')),
  link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forja_budget_rules (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category varchar(100) not null,
  monthly_limit double precision not null,
  alert_at integer not null default 80,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.forja_finance_notes (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title varchar(500) not null,
  content text,
  color varchar(20) not null default '#FBBF24',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ Foco ============
create table if not exists public.forja_focus_projects (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name varchar(255) not null,
  color varchar(20) not null default '#EF4444',
  total_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.forja_focus_sessions (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id bigint references public.forja_focus_projects (id) on delete set null,
  project_name varchar(255) not null default 'Sem projeto',
  duration integer not null,
  type text not null default 'focus' check (type in ('focus', 'break')),
  date varchar(10) not null,
  time varchar(5) not null,
  created_at timestamptz not null default now()
);
create index if not exists forja_focus_sessions_user_date_idx on public.forja_focus_sessions (user_id, date);

-- ============ Água ============
create table if not exists public.forja_water_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date varchar(10) not null,
  amount_ml integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ============ Notificações in-app Forja ============
create table if not exists public.forja_app_notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type varchar(50) not null,
  title varchar(255) not null,
  message text not null,
  icon varchar(10) not null default '🔔',
  color varchar(50) not null default 'text-yellow-400',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists forja_app_notifications_user_idx on public.forja_app_notifications (user_id);

-- ============ Push (opcional) ============
create table if not exists public.forja_push_subscriptions (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- ============ Conquistas ============
create table if not exists public.forja_user_achievements (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_key varchar(100) not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create table if not exists public.forja_featured_achievements (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot integer not null check (slot >= 1 and slot <= 3),
  achievement_key varchar(100),
  updated_at timestamptz not null default now(),
  unique (user_id, slot)
);
