-- Revisão espaçada: vínculo com Flashcards / Resumidor (linked_material_*)
-- Execute no Supabase: SQL Editor → New query → Run.
-- Se o erro persistir: Settings → API → "Reload schema" (ou aguarde ~1 min).

alter table spaced_topics
  add column if not exists linked_material_kind text default 'none';

alter table spaced_topics
  add column if not exists linked_material_query text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'spaced_topics_linked_material_kind_check'
  ) then
    alter table spaced_topics
      add constraint spaced_topics_linked_material_kind_check
      check (
        linked_material_kind is null
        or linked_material_kind in ('none', 'flashcards', 'summarizer', 'both')
      );
  end if;
end $$;

comment on column spaced_topics.linked_material_kind is 'Destaque de atalhos: none | flashcards | summarizer | both';
comment on column spaced_topics.linked_material_query is 'Texto para ?q= flashcards e ?prefill= resumidor; vazio = matéria + tópico no app';
