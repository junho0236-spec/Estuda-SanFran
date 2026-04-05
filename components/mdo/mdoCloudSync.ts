import { supabase } from '../../services/supabaseClient';
import type { MdoPersisted } from './types';
import { isMdoPersistedEmpty, migrateMdoPersisted, type MdoLocalMeta } from './persist';

export interface MdoCloudRow {
  payload: unknown;
  updated_at: string;
}

/** Lê o snapshot na nuvem (null se não existir linha ou erro de rede/schema). */
export async function fetchMdoCloudRow(userId: string): Promise<MdoCloudRow | null> {
  const { data, error } = await supabase
    .from('mdo_user_data')
    .select('payload, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[MDO cloud] fetch:', error.message);
    return null;
  }
  if (!data?.updated_at) return null;
  return { payload: data.payload, updated_at: data.updated_at };
}

/** Grava snapshot; devolve `updated_at` do servidor ou null em erro. */
export async function upsertMdoCloud(userId: string, payload: MdoPersisted): Promise<string | null> {
  const { data, error } = await supabase
    .from('mdo_user_data')
    .upsert({ user_id: userId, payload }, { onConflict: 'user_id' })
    .select('updated_at')
    .single();

  if (error) {
    console.warn('[MDO cloud] upsert:', error.message);
    return null;
  }
  return data?.updated_at ?? null;
}

/**
 * Compara relógio local de edição (`lastLocalEditAt` em meta) com `updated_at` do servidor.
 * Servidor mais recente → usa payload remoto; caso contrário mantém local e pede push.
 */
export function resolveMdoMerge(
  local: MdoPersisted,
  meta: MdoLocalMeta,
  remote: MdoCloudRow | null
): { chosen: MdoPersisted; nextMeta: MdoLocalMeta; pushLocalToCloud: boolean } {
  if (!remote) {
    return {
      chosen: local,
      nextMeta: meta,
      pushLocalToCloud: !isMdoPersistedEmpty(local),
    };
  }

  const remotePayload = migrateMdoPersisted(remote.payload);
  const remoteMs = new Date(remote.updated_at).getTime();
  const localMs = new Date(meta.lastLocalEditAt).getTime();

  if (remoteMs > localMs) {
    return {
      chosen: remotePayload,
      nextMeta: { lastLocalEditAt: remote.updated_at },
      pushLocalToCloud: false,
    };
  }

  return {
    chosen: local,
    nextMeta: meta,
    pushLocalToCloud: true,
  };
}
