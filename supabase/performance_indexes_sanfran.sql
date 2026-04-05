-- Índices sugeridos para aliviar CPU no Postgres (planos pequenos / muitos users).
-- Correr no SQL Editor do Supabase quando o projeto estiver estável (ou em janela de baixo tráfego).
-- CREATE INDEX IF NOT EXISTS é idempotente; ignora se o índice já existir com o mesmo nome.

-- Tabelas usadas em App.loadUserData (filtro user_id + ordenação / archived)
create index if not exists idx_flashcards_user_archived
  on public.flashcards (user_id)
  where archived_at is null;

create index if not exists idx_tasks_user_created_archived
  on public.tasks (user_id, created_at desc)
  where archived_at is null;

create index if not exists idx_folders_user_id on public.folders (user_id);
create index if not exists idx_subjects_user_id on public.subjects (user_id);
create index if not exists idx_boards_user_created on public.boards (user_id, created_at desc);
create index if not exists idx_study_sessions_user_start on public.study_sessions (user_id, start_time desc);
create index if not exists idx_readings_user_created on public.readings (user_id, created_at desc);
create index if not exists idx_user_progress_user_id on public.user_progress (user_id);

-- Perfil / disciplinas (ex.: Profile.tsx)
create index if not exists idx_disciplinas_user_id on public.disciplinas (user_id);

-- Realtime / duels (se ainda não existirem)
create index if not exists idx_duels_opponent on public.duels (opponent_id);
create index if not exists idx_duels_challenger on public.duels (challenger_id);
