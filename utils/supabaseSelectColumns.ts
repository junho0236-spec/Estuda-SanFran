/**
 * Literais de colunas para `.select()` no Supabase — evita `select('*')` e mantém inferência de tipos.
 * Alinhar com `types.ts` e com o schema real; se o PostgREST devolver PGRST204, ajustar a lista.
 */

// --- user_persona ---
export const USER_PERSONA_FOR_APP_PROFILE =
  'id, persona_data, full_name, bio, avatar_url, profile_completion, turma_ano, turma, sala, aniversario, idiomas, intercambio, progresso_total, progresso_obrigatorias, progresso_optativas, status_geral_integralizacao, mural_fotos, experiencias_lideranca, integralizacao_curriculo, curriculo_url, badges, social_links, creditos_aula, creditos_trabalho, media, horas_extensao, entidades, cargos_academicos, updated_at, last_seen';

/** Lista comunidade / Friends (cartões). */
export const USER_PERSONA_COMMUNITY_LIST =
  'id, full_name, avatar_url, persona_data, turma_ano';

// --- Disciplinas & ficheiros ---
export const DISCIPLINAS_LIST_COLUMNS = 'id, user_id, codigo, nome, turma_sala, horarios, created_at';

export const SUBJECT_FILES_LIST_COLUMNS =
  'id, user_id, subject_id, name, type, file_url, content, created_at';

// --- Social / dados partilhados ---
export const FRIENDSHIPS_LIST_COLUMNS = 'id, user_id, friend_id, status, created_at, updated_at';

export const NOTIFICATIONS_LIST_COLUMNS =
  'id, user_id, message, is_read, link_task, type, created_at';

export const NOTES_LIST_COLUMNS =
  'id, subject_id, user_id, title, content, handwriting_data, updated_at, tags, is_starred';

export const STUDY_SESSIONS_LIST_COLUMNS =
  'id, user_id, start_time, duration, subject_id, folder_id, reading_id, task_id, rating';

export const DAILY_QUESTS_ROW_COLUMNS = 'id, user_id, date, quests, claimed';

export const USER_PROGRESS_CLOUD_COLUMNS =
  'user_id, favorites, wrong_questions, wrong_question_ids, correct_questions, notes, correct_count, wrong_count, error_mastery, confidence_levels, question_stats, question_answer_goals, updated_at';

// --- Question bank ---
export const QUESTION_COMMENTS_LIST_COLUMNS =
  'id, question_id, user_id, content, created_at, parent_id, reply_to_user_id, author_kind';

// --- Anki / spaced repetition ---
export const DECK_REQUESTS_LIST_COLUMNS = 'id, user_id, topic, votes, created_at';

export const SPACED_TOPICS_LIST_COLUMNS =
  'id, user_id, subject, topic, study_date, reviews_completed, review_completion_dates, cycles, created_at, content, srs_algorithm, srs_ease_factor, srs_repetitions, srs_interval_days, srs_next_review_at, srs_fsrs_card, review_snoozes, srs_cumulative_offset_days, linked_material_kind, linked_material_query, linked_question_bank_ai_count';

// --- Clube do livro / SF ---
export const SF_BOOK_CYCLES_ROW_COLUMNS =
  'id, month_year, status, candidates, selected_book, current_week, created_at';

export const SF_BOOK_CHAT_LIST_COLUMNS =
  'id, cycle_id, user_id, user_name, message, created_at';

export const SF_EVENTS_LIST_COLUMNS =
  'id, title, description, event_date, location, category, organizer, created_by, created_at';

export const SF_EVENT_RSVPS_LIST_COLUMNS = 'id, event_id, user_id, user_name, created_at';

export const SF_PLACES_LIST_COLUMNS = 'id, name, category, address, created_at';

export const SF_PLACE_REVIEWS_LIST_COLUMNS =
  'id, place_id, user_name, rating_price, rating_distance, rating_wifi, veteran_tip, created_at';

export const JURIS_CASES_LIST_COLUMNS =
  'id, user_id, user_name, title, content, created_at';

export const JURIS_VOTES_LIST_COLUMNS =
  'id, case_id, user_id, user_name, vote, foundation, created_at';

export const SF_POLLS_LIST_COLUMNS =
  'id, question, option_a, option_b, category, date, votes_a, votes_b, created_at';

export const SF_POLL_COMMENTS_LIST_COLUMNS =
  'id, poll_id, user_id, user_name, content, vote_choice, created_at';

export const SF_INTERNSHIPS_LIST_COLUMNS =
  'id, role_title, office_name, area, stipend, requirements, insider_tip, contact_info, user_id, user_name, created_at';

export const SF_MOBILITY_POSTS_LIST_COLUMNS =
  'id, type, title, description, location, time, price, contact_info, available_spots, user_id, user_name, created_at';

export const PATIO_CLASSIFIEDS_LIST_COLUMNS =
  'id, user_id, user_name, category, title, description, contact_info, is_boosted, created_at';

export const MOCK_JURY_SESSIONS_LIST_COLUMNS =
  'id, title, description, creator_id, creator_name, prosecutor_id, prosecutor_name, defense_id, defense_name, prosecutor_argument, defense_argument, status, votes_prosecutor, votes_defense, voting_ends_at, winner_id, created_at';

export const SF_QUOTES_LIST_COLUMNS =
  'id, user_id, user_name, professor, subject, quote, likes_funny, likes_shock, created_at';

export const STUDY_PACTS_LIST_COLUMNS =
  'id, title, creator_id, creator_name, partner_id, partner_name, target_hours_per_day, duration_days, stake_amount, status, start_date, created_at';

export const SF_VAULT_ITEMS_LIST_COLUMNS =
  'id, title, category, subject, professor, year, file_url, uploader_id, uploader_name, upvotes, downloads, created_at';

export const OFFICE_TRADES_LIST_COLUMNS =
  'id, user_id, user_name, offered_item_id, requested_item_id, status, created_at';

export const OFFICE_STATE_FULL_COLUMNS =
  'id, user_id, inventory, config, boxes_opened, bonus_boxes, updated_at';

export const SUMMARIES_LIST_COLUMNS =
  'id, user_id, original_text, generated_text, type, created_at';

export const TRUNFO_SCORES_ROW_COLUMNS = 'id, user_id, user_name, wins, losses';

export const TYPING_SCORES_LIST_COLUMNS =
  'id, user_id, user_name, wpm, accuracy, text_source, created_at';

export const VISUAL_FLASHCARDS_PROGRESS_ROW_COLUMNS =
  'id, user_id, language, total_score, best_streak, last_played';

export const EXCHANGE_RPG_SAVES_ROW_COLUMNS =
  'id, user_id, city, current_scenario_id, stats, updated_at';

export const IDIOMAS_PROGRESS_ROW_COLUMNS =
  'id, user_id, current_level_id, streak_count, total_xp, lives, completed_lessons, last_activity_date';

export const SYLLABUS_TRACKERS_LIST_COLUMNS =
  'id, user_id, subject_id, subject_name, title, created_at';

export const SYLLABUS_TOPICS_LIST_COLUMNS =
  'id, tracker_id, user_id, title, is_completed, confidence_level, created_at';

export const SOCIETIES_LIST_COLUMNS = 'id, name, motto, created_by, created_at';

export const SOCIETY_MESSAGES_LIST_COLUMNS =
  'id, society_id, user_id, user_name, content, created_at';

export const SOCIETY_DEADLINES_LIST_COLUMNS =
  'id, society_id, title, date, category, created_by, created_at';

export const STUDY_PLANS_LIST_COLUMNS =
  'id, user_id, title, exam_date, daily_hours, subjects_config, syllabus_text, generated_schedule, created_at';

export const PRESCRIPTION_LOGS_LIST_COLUMNS =
  'id, user_id, crime_title, max_penalty_years, prescription_limit, is_prescribed, details, created_at';

export const PETITUM_TEMPLATES_LIST_COLUMNS =
  'id, title, category, description, structure, created_at';

export const PETITION_WIKI_POSTS_LIST_COLUMNS =
  'id, title, content, category, author_id, author_name, validation_count, is_consolidated, created_at';

export const MURAL_MESSAGES_LIST_COLUMNS =
  'id, user_id, user_name, content, color, created_at';

export const MNEMONICS_LIST_COLUMNS =
  'id, acronym, title, subject, expansion, description, user_id, created_at';

export const MENTOR_PROFILES_LIST_COLUMNS =
  'id, user_id, user_name, areas, bio, contact_info, semester, created_at';

export const LATIN_TERMS_LIST_COLUMNS = 'id, term, meaning, difficulty, created_at';

export const JURIS_TINDER_CARDS_LIST_COLUMNS =
  'id, theme, case_scenario, is_procedent, ruling_summary, source';

export const CLASS_WAR_LEADERBOARD_COLUMNS =
  'class_year, student_count, total_seconds, total_tasks';

export const GENERAL_LANG_PROGRESS_ROW_COLUMNS =
  'id, user_id, completed_lessons, total_xp, updated_at';

export const ERROR_LOGS_LIST_COLUMNS =
  'id, user_id, discipline, topic, reason, justification, created_at';

export const EDITAIS_LIST_COLUMNS =
  'id, title, status, category, salary, deadline, link, description, institution, region, created_at';

export const DOSIMETRIA_LOGS_LIST_COLUMNS =
  'id, user_id, title, min_years, min_months, max_years, max_months, circumstances, agravantes, atenuantes, increase_fraction, decrease_fraction, final_result_months, created_at';

export const DEBATE_HISTORY_LIST_COLUMNS =
  'id, user_id, topic, stance, duration_seconds, notes, created_at';

export const DEADLINE_PLANNER_ITEMS_LIST_COLUMNS =
  'id, user_id, title, due_date, difficulty, is_completed, created_at';

export const CODE_READING_PLANS_LIST_COLUMNS =
  'id, user_id, code_id, code_name, total_articles, target_days, articles_per_day, completed_days, start_date, created_at';

export const ATTENDANCE_RECORDS_LIST_COLUMNS =
  'id, user_id, subject_name, total_hours, absences, created_at';

export const USER_TRAILS_ROW_COLUMNS =
  'id, user_id, goal, current_step_id, completed_steps, created_at';

export const AUCTIONS_LIST_COLUMNS =
  'id, creator_id, creator_name, item_title, item_description, start_price, current_price, highest_bidder_id, highest_bidder_name, ends_at, status, created_at';

export const INVESTIGATION_BOARDS_ROW_COLUMNS =
  'id, user_id, title, nodes, edges, updated_at';

export const IRAC_ENTRIES_LIST_COLUMNS =
  'id, user_id, case_title, facts, issue, rule, analysis, conclusion, tags, created_at';

export const LEGAL_TRANSLATIONS_LIST_COLUMNS =
  'id, user_id, original_text, simplified_text, created_at';

export const HONORARIOS_LOGS_LIST_COLUMNS =
  'id, user_id, client_name, area, act_type, cause_value, base_fee, success_fee_percent, total_estimate, created_at';

export const USER_ANNOTATIONS_LIST_COLUMNS =
  'id, user_id, law_id, article_id, content, color, created_at';

// --- Connect (chat) — usado por `Connect.tsx` via re-export em `connectSupabaseColumns.ts` ---
export const CONNECT_CHAT_SCHEDULED_ITEMS_COLUMNS =
  'id, room_id, user_id, user_name, kind, content, scheduled_at, status, reply_to_id, reply_to_content, reply_to_sender_name, context_text, created_at, error_text';

export const CONNECT_CHAT_ROOMS_COLUMNS =
  'id, name, is_group, last_message, last_message_at, created_at, updated_at, created_by, avatar_url, category, require_join_approval, moderation_settings';

export const CONNECT_CHAT_PARTICIPANTS_COLUMNS =
  'id, room_id, user_id, user_name, user_avatar, unread_count, is_typing, is_pinned, is_archived, muted_until, category, last_read_at, created_at, group_role, join_status';

export const CONNECT_CHAT_MESSAGES_COLUMNS =
  'id, room_id, sender_id, sender_name, content, attachment_url, attachment_name, attachment_type, status, created_at, is_edited, is_deleted, reply_to_id, reply_to_content, reply_to_sender_name, thread_root_id, is_forwarded, forwarded_from_name, message_type, shared_profile_id, link_preview, updated_at, is_vanish, expires_at';

export const CONNECT_CHAT_ROOM_SETTINGS_COLUMNS =
  'user_id, room_id, wallpaper_url, wallpaper_color, background_color, updated_at';

export const CONNECT_CHAT_CALLS_LIST_COLUMNS =
  'id, room_id, caller_id, receiver_id, type, status, created_at';

export const CONNECT_CHAT_CALLS_FULL_COLUMNS =
  'id, room_id, caller_id, receiver_id, type, status, created_at, signaling_data, updated_at';

export const CONNECT_CHAT_STORIES_COLUMNS =
  'id, user_id, user_name, user_avatar, content, type, media_url, created_at, expires_at';

export const CONNECT_CHAT_REACTIONS_COLUMNS = 'id, message_id, user_id, emoji';

export const CONNECT_FRIENDSHIPS_COLUMNS = FRIENDSHIPS_LIST_COLUMNS;

export const CONNECT_USER_PERSONA_SELF_COLUMNS = 'id, bio, avatar_url, full_name, persona_data';

export const CONNECT_USER_PERSONA_DISCOVERY_COLUMNS = 'id, full_name, bio, avatar_url';

export const CONNECT_USER_PERSONA_PEER_COLUMNS = CONNECT_USER_PERSONA_SELF_COLUMNS;

export const CONNECT_USER_PERSONA_SHARE_COLUMNS = 'id, full_name';

export const CONNECT_USER_PERSONA_LAST_SEEN = 'last_seen';

export const CONNECT_USER_PERSONA_CALL_ENRICH_COLUMNS = 'full_name, avatar_url';

export const CONNECT_CHAT_POLLS_WITH_VOTES =
  'id, message_id, question, options, is_closed, created_at, chat_messages!inner(room_id), chat_poll_votes(id,user_id,option_index)';
