
import React from 'react';

export enum View {
  Dashboard = 'dashboard',
  Anki = 'anki',
  Timer = 'timer',
  Subjects = 'subjects',
  Tasks = 'tasks',
  Calendar = 'calendar',
  Ranking = 'ranking',
  Library = 'library',
  Largo = 'largo',
  Mural = 'mural',
  Calculator = 'calculator',
  DeadlineCalculator = 'deadline_calculator',
  OralArgument = 'oral_argument',
  StudyRoom = 'study_room',
  Office = 'office',
  Societies = 'societies',
  LeiSeca = 'lei_seca',
  Editais = 'editais',
  Timeline = 'timeline',
  DeadArchive = 'dead_archive',
  CitationGenerator = 'citation_generator',
  JurisprudenceMural = 'jurisprudence_mural',
  SumulaChallenge = 'sumula_challenge',
  Sebo = 'sebo',
  Duel = 'duel',
  OabCountdown = 'oab_countdown',
  Specialization = 'specialization',
  TypingChallenge = 'typing_challenge',
  Petitum = 'petitum',
  Dosimetria = 'dosimetria',
  Debate = 'debate',
  Trunfo = 'trunfo',
  Honorarios = 'honorarios',
  Checklist = 'checklist',
  InvestigationBoard = 'investigation_board',
  LatinGame = 'latin_game',
  SucessaoSimulator = 'sucessao_simulator',
  JurisTinder = 'juris_tinder',
  InternRPG = 'intern_rpg',
  PrescriptionCalculator = 'prescription_calculator',
  SanFranIdiomas = 'sanfran_idiomas',
  DigitalID = 'digital_id'
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subjectId: string;
  folderId: string | null;
  nextReview: number;
  interval: number;
  archived_at?: string | null;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export type TaskPriority = 'urgente' | 'alta' | 'normal';
export type TaskCategory = 'peticao' | 'estudo' | 'audiencia' | 'admin' | 'geral';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subjectId?: string;
  dueDate?: string;
  completedAt?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  archived_at?: string | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  start_time: string;
  duration: number;
  subject_id: string;
  reading_id?: string;
}

export interface Reading {
  id: string;
  user_id: string;
  title: string;
  author: string;
  total_pages: number;
  current_page: number;
  subject_id?: string;
  status: 'lendo' | 'concluido' | 'pausado';
  created_at?: string;
}

export interface RankingEntry {
  user_id: string;
  name: string;
  total_seconds: number;
  rank_name: string;
}

export interface Note {
  content: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isUnlocked: boolean;
}

export interface PresenceUser {
  user_id: string;
  name: string;
  view: string;
  subject_name?: string;
  is_timer_active: boolean;
  last_seen: string;
  // New fields for Study Rooms
  study_room_id?: string;
  study_start_time?: number; // timestamp
}

export interface MuralMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  color: 'yellow' | 'blue' | 'red' | 'green';
  created_at: string;
}

export interface Society {
  id: string;
  name: string;
  motto: string;
  created_by: string;
  created_at: string;
  // Campos calculados no frontend
  total_hours?: number;
  member_count?: number;
}

export interface SocietyMember {
  user_id: string;
  name: string;
  total_seconds: number;
  role?: 'founder' | 'associate';
}

export interface SocietyMessage {
  id: string;
  society_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface SocietyDeadline {
  id: string;
  society_id: string;
  title: string;
  date: string; // YYYY-MM-DD
  category: 'prova' | 'trabalho' | 'seminario' | 'outros';
  created_by: string;
  created_at: string;
}

export type QuestType = 'focus_time' | 'review_cards' | 'complete_task';

export interface Quest {
  id: string;
  type: QuestType;
  description: string; // Ex: "Cumpra 30 min de foco"
  target: number; // Ex: 30 (minutos) ou 10 (cards)
  current: number;
  completed: boolean;
  reward_type: 'box' | 'xp';
  reward_amount: number;
}

export interface DailyQuestData {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  quests: Quest[];
  claimed: boolean;
}

export interface ArticleAnnotation {
  id?: string;
  law_id: string;
  article_id: string;
  content: string;
  color: 'yellow' | 'green' | 'pink' | 'blue' | 'none';
}

// New interfaces for Jurisprudence Mural
export interface JurisCase {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  content: string;
  created_at: string;
}

export interface JurisVote {
  id: string;
  case_id: string;
  user_id: string;
  user_name: string;
  vote: 'deferido' | 'indeferido';
  foundation: string;
  created_at: string;
}

export interface OfficeTrade {
  id: string;
  user_id: string;
  user_name: string;
  offered_item_id: string;
  requested_item_id: string;
  status: 'open' | 'completed' | 'cancelled';
  created_at: string;
}

export interface DuelQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
  category: string;
}

export interface Duel {
  id: string;
  challenger_id: string;
  challenger_name: string;
  opponent_id: string;
  opponent_name: string;
  status: 'pending' | 'active' | 'finished' | 'declined';
  questions: DuelQuestion[];
  challenger_score: number;
  opponent_score: number;
  challenger_progress: number;
  opponent_progress: number;
  winner_id: string | null;
  created_at: string;
}

export interface UserConfig {
  oab_exam_date: string;
}

export interface PetitumSection {
  title: string;
  skeleton: string;
  explanation: string;
}

export interface PetitumTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  structure: PetitumSection[];
}

// Investigation Board Types
export type NodeType = 'person' | 'evidence' | 'note' | 'place';

export interface BoardNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  details?: string;
}

export interface BoardEdge {
  id: string;
  from: string;
  to: string;
}

export interface InvestigationBoardData {
  id: string;
  title: string;
  nodes: BoardNode[];
  edges: BoardEdge[];
  updated_at: string;
}

// Latin Game Types
export interface LatinTerm {
  id: string;
  term: string;
  meaning: string;
  difficulty?: string;
}

// Juris Tinder Types
export interface JurisTinderCard {
  id: string;
  theme: string;
  case_scenario: string; // O caso concreto resumido
  is_procedent: boolean; // true = deferido/procedente, false = indeferido
  ruling_summary: string; // Explicação da decisão
  source: string; // e.g. "Súmula Vinculante 12"
}

// InternRPG Types
export interface RPGStat {
  label: string;
  value: number;
  max: number;
  color: string;
}

export interface RPGChoice {
  text: string;
  nextId: string;
  effect?: {
    sanity?: number;
    reputation?: number;
    energy?: number;
  };
  feedback?: string;
}

export interface RPGScenario {
  id: string;
  title: string;
  text: string;
  choices: RPGChoice[];
  image?: React.ElementType; // Icon
}

// --- SANFRAN IDIOMAS TYPES ---
export interface IdiomaLesson {
  id: string;
  module: string; // "Foundations", "Contracts", "Courtroom", etc
  title: string;
  description: string;
  theory: string;
  example_sentence: string;
  type?: 'quiz' | 'scramble' | 'matching' | 'fill_blank' | 'dictation'; // Adicionado dictation
  scramble?: {
    sentence: string;
    translation: string;
  };
  quiz?: {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  };
  matching?: {
    pairs: { term: string; translation: string }[];
  };
  fill_blank?: {
    sentence_start: string;
    sentence_end: string;
    correct_word: string;
    options: string[];
    translation: string;
  };
  dictation?: {
    text: string;
    translation: string;
  };
  xp_reward: number;
  words_unlocked: string[]; // Termos chave aprendidos na lição para o glossário
}

export interface IdiomaProgress {
  current_level_id: string;
  streak_count: number;
  total_xp: number;
  lives: number;
  completed_lessons: string[];
  last_activity_date?: string | null;
}
