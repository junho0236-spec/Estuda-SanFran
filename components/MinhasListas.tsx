import React, { useEffect, useMemo, useState } from 'react';
import {
  ListTodo,
  Plus,
  Trash2,
  Pin,
  PinOff,
  CheckCircle2,
  Circle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import type { PersonalChecklist, PersonalChecklistItem } from '../types';

interface MinhasListasProps {
  userId: string;
  isOnline: boolean;
}

function createNewList(userId: string, title: string): PersonalChecklist {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    title: title.trim() || 'Nova Lista',
    description: null,
    items: [],
    is_pinned: false,
    archived_at: null,
    created_at: now,
    updated_at: now,
  };
}

function reorderItems(items: PersonalChecklistItem[]): PersonalChecklistItem[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

function groupUncheckedFirst(items: PersonalChecklistItem[]): PersonalChecklistItem[] {
  const sorted = [...items].sort((a, b) => {
    if (a.checked === b.checked) return a.order - b.order;
    return Number(a.checked) - Number(b.checked);
  });
  return reorderItems(sorted);
}

const MinhasListas: React.FC<MinhasListasProps> = ({ userId, isOnline }) => {
  const [lists, setLists] = useState<PersonalChecklist[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListTitle, setNewListTitle] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await dataService.getPersonalChecklists(userId, isOnline);
        if (!alive) return;
        setLists(rows);
        setSelectedListId((prev) => {
          if (prev && rows.some((list) => list.id === prev)) return prev;
          return rows[0]?.id ?? null;
        });
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [userId, isOnline]);

  const selectedList = useMemo(
    () => lists.find((list) => list.id === selectedListId) ?? null,
    [lists, selectedListId]
  );

  const saveList = async (nextList: PersonalChecklist) => {
    setIsSaving(true);
    try {
      await dataService.savePersonalChecklist(nextList, userId, isOnline);
    } finally {
      setIsSaving(false);
    }
  };

  const updateList = async (
    listId: string,
    updater: (current: PersonalChecklist) => PersonalChecklist
  ) => {
    const current = lists.find((list) => list.id === listId);
    if (!current) return;
    const updated = updater(current);
    setLists((prev) =>
      prev
        .map((list) => (list.id === listId ? updated : list))
        .sort((a, b) => {
          const pinDiff = Number(!!b.is_pinned) - Number(!!a.is_pinned);
          if (pinDiff !== 0) return pinDiff;
          return String(b.updated_at).localeCompare(String(a.updated_at));
        })
    );
    await saveList(updated);
  };

  const handleCreateList = async () => {
    const draftTitle = newListTitle.trim();
    if (!draftTitle) return;
    const next = createNewList(userId, draftTitle);
    setLists((prev) => [next, ...prev]);
    setSelectedListId(next.id);
    setNewListTitle('');
    await saveList(next);
  };

  const handleDeleteList = async (listId: string) => {
    setLists((prev) => prev.filter((list) => list.id !== listId));
    if (selectedListId === listId) {
      const fallback = lists.find((list) => list.id !== listId);
      setSelectedListId(fallback?.id ?? null);
    }
    await dataService.deletePersonalChecklist(listId, userId, isOnline);
  };

  const handleAddItem = async () => {
    const text = newItemText.trim();
    if (!selectedList || !text) return;
    const nextItem: PersonalChecklistItem = {
      id: crypto.randomUUID(),
      text,
      checked: false,
      order: selectedList.items.length,
      checked_at: null,
    };

    await updateList(selectedList.id, (current) => {
      const ordered = [...current.items].sort((a, b) => a.order - b.order);
      const firstCheckedIndex = ordered.findIndex((item) => item.checked);
      if (firstCheckedIndex === -1) {
        return {
          ...current,
          items: reorderItems([...ordered, nextItem]),
          updated_at: new Date().toISOString(),
        };
      }
      const nextItems = [...ordered];
      nextItems.splice(firstCheckedIndex, 0, nextItem);
      return {
        ...current,
        items: reorderItems(nextItems),
        updated_at: new Date().toISOString(),
      };
    });
    setNewItemText('');
  };

  const handleToggleItem = async (itemId: string) => {
    if (!selectedList) return;
    const now = new Date().toISOString();
    await updateList(selectedList.id, (current) => {
      const updatedItems = current.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              checked: !item.checked,
              checked_at: !item.checked ? now : null,
            }
          : item
      );
      return {
        ...current,
        items: groupUncheckedFirst(updatedItems),
        updated_at: now,
      };
    });
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedList) return;
    await updateList(selectedList.id, (current) => ({
      ...current,
      items: reorderItems(current.items.filter((item) => item.id !== itemId)),
      updated_at: new Date().toISOString(),
    }));
  };

  const moveItem = async (itemId: string, direction: 'up' | 'down') => {
    if (!selectedList) return;
    const currentItems = [...selectedList.items].sort((a, b) => a.order - b.order);
    const index = currentItems.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentItems.length) return;
    const copy = [...currentItems];
    const [moving] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moving);

    await updateList(selectedList.id, (current) => ({
      ...current,
      items: reorderItems(copy),
      updated_at: new Date().toISOString(),
    }));
  };

  const checkedCount = selectedList?.items.filter((item) => item.checked).length ?? 0;
  const totalCount = selectedList?.items.length ?? 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl min-h-0 flex-col gap-6 pb-20">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-violet-700">
          <ListTodo size={14} />
          Minhas Listas
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
          Listas tematicas de estudo
        </h1>
        <p className="text-sm font-medium text-slate-500 md:text-base">
          Organize rotinas sem misturar com tarefas ou docs. Ex.: musicas, vocabulario e revisoes.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className="lg:col-span-4 min-h-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 lg:sticky lg:top-4 lg:h-[calc(100dvh-10rem)] lg:self-start lg:flex lg:flex-col">
          <div className="mb-4 flex gap-2">
            <input
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleCreateList();
              }}
              placeholder="Nova lista (ex.: Musicas em ingles)"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <button
              type="button"
              onClick={() => void handleCreateList()}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-violet-600 text-white transition-colors hover:bg-violet-700"
              aria-label="Criar lista"
              title="Criar lista"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="custom-scrollbar flex flex-col gap-2 overflow-y-auto pr-1 lg:min-h-0 lg:flex-1">
            {isLoading && (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500">
                Carregando listas...
              </p>
            )}
            {!isLoading && lists.length === 0 && (
              <p className="rounded-xl bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500">
                Voce ainda nao tem listas. Crie a primeira para comecar.
              </p>
            )}
            {lists.map((list) => {
              const isActive = list.id === selectedListId;
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => setSelectedListId(list.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'border-violet-300 bg-violet-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800">{list.title}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        {(list.items || []).filter((item) => item.checked).length}/{list.items.length} concluidos
                      </p>
                    </div>
                    {list.is_pinned ? <Pin size={14} className="text-violet-600" /> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-8 min-h-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          {!selectedList ? (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl bg-slate-50 text-center">
              <p className="max-w-sm text-sm font-semibold text-slate-500">
                Selecione uma lista para editar os itens diarios.
              </p>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-black tracking-tight text-slate-900">
                    {selectedList.title}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">
                    {checkedCount}/{totalCount} itens concluidos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void updateList(selectedList.id, (current) => ({
                        ...current,
                        is_pinned: !current.is_pinned,
                        updated_at: new Date().toISOString(),
                      }))
                    }
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition-colors hover:border-violet-300 hover:text-violet-700"
                  >
                    {selectedList.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                    {selectedList.is_pinned ? 'Desafixar' : 'Fixar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteList(selectedList.id)}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAddItem();
                  }}
                  placeholder="Adicionar item (ex.: revisar 10 palavras da musica)"
                  className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
                <button
                  type="button"
                  onClick={() => void handleAddItem()}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-violet-600 text-white transition-colors hover:bg-violet-700"
                  aria-label="Adicionar item"
                  title="Adicionar item"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {selectedList.items.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                    Esta lista ainda nao possui itens.
                  </div>
                ) : (
                  groupUncheckedFirst(selectedList.items)
                    .map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => void handleToggleItem(item.id)}
                          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center text-violet-700"
                          aria-label={item.checked ? 'Desmarcar item' : 'Marcar item'}
                        >
                          {item.checked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        <p
                          className={`min-w-0 flex-1 text-sm font-semibold ${
                            item.checked ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}
                        >
                          {item.text}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void moveItem(item.id, 'up')}
                            disabled={index === 0}
                            className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
                            aria-label="Mover item para cima"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void moveItem(item.id, 'down')}
                            disabled={index === selectedList.items.length - 1}
                            className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40"
                            aria-label="Mover item para baixo"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveItem(item.id)}
                            className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg border border-red-200 text-red-500"
                            aria-label="Excluir item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>

              <p className="text-[11px] font-semibold text-slate-400">
                {isSaving ? 'Salvando alteracoes...' : 'As alteracoes sao sincronizadas automaticamente.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default MinhasListas;
