
import { supabase } from './supabaseClient';
import { Quest, DailyQuestData, QuestType } from '../types';

export const getTodayDateStr = () => {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
};

const generateDailyQuests = (): Quest[] => {
  return [
    {
      id: 'q1',
      type: 'focus_time',
      description: 'Cumpra 45 minutos de Foco na Pauta',
      target: 45, // minutos
      current: 0,
      completed: false,
      reward_type: 'box',
      reward_amount: 1
    },
    {
      id: 'q2',
      type: 'review_cards',
      description: 'Revise 15 Flashcards de Doutrina',
      target: 15,
      current: 0,
      completed: false,
      reward_type: 'xp',
      reward_amount: 100
    },
    {
      id: 'q3',
      type: 'complete_task',
      description: 'Cumpra 2 Processos (Tarefas) da Lista',
      target: 2,
      current: 0,
      completed: false,
      reward_type: 'xp',
      reward_amount: 50
    }
  ];
};

export const fetchDailyQuests = async (userId: string): Promise<DailyQuestData | null> => {
  const today = getTodayDateStr();
  
  try {
    const { data, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (data) return data;

    // Se não existir, criar novas missões
    if (error && (error.code === 'PGRST116' || !data)) {
      const newQuests = generateDailyQuests();
      const { data: newData, error: insertError } = await supabase
        .from('daily_quests')
        .insert({
          user_id: userId,
          date: today,
          quests: newQuests,
          claimed: false
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      return newData;
    }
    
    return null;
  } catch (e) {
    console.error("Erro ao buscar quests:", e);
    return null;
  }
};

export const updateQuestProgress = async (userId: string, type: QuestType, amount: number) => {
  const today = getTodayDateStr();
  
  try {
    const { data: currentData } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (!currentData) return;

    let updated = false;
    const newQuests = currentData.quests.map((q: Quest) => {
      if (q.type === type && !q.completed) {
        const newCurrent = q.current + amount;
        updated = true;
        return {
          ...q,
          current: newCurrent,
          completed: newCurrent >= q.target
        };
      }
      return q;
    });

    if (updated) {
      await supabase
        .from('daily_quests')
        .update({ quests: newQuests })
        .eq('id', currentData.id);
    }

  } catch (e) {
    console.error("Erro ao atualizar progresso da quest:", e);
  }
};

export const claimRewards = async (userId: string, questData: DailyQuestData) => {
  try {
    // 1. Marca como claimado
    await supabase.from('daily_quests').update({ claimed: true }).eq('id', questData.id);

    // 2. Adiciona Caixa Bônus ao Office State
    const { data: office } = await supabase.from('office_state').select('bonus_boxes').eq('user_id', userId).single();
    
    const currentBonus = office?.bonus_boxes || 0;
    
    await supabase.from('office_state').upsert({
      user_id: userId,
      bonus_boxes: currentBonus + 1, // Recompensa padrão: 1 Caixa
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    return true;
  } catch (e) {
    console.error("Erro ao resgatar recompensa:", e);
    return false;
  }
};
