import { supabase } from './supabase';

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  score: number;
  lives: number;
  status: string;
  totalTimeMs: number;
}

/**
 * End a session: persist checkpoint results, build leaderboard, set status='ended'.
 * Uses a WHERE status='running' guard so only one caller wins in a race.
 * Returns null if the session was already ended.
 */
export async function endSession(sessionId: string): Promise<LeaderboardEntry[] | null> {
  const { data: updated, error: updateError } = await supabase
    .from('sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('status', 'running')
    .select('id, lesson_id')
    .single();

  if (updateError || !updated) {
    return null;
  }

  const lessonId = updated.lesson_id;

  // Persist aggregate results per question into session_checkpoint_results.
  // The table FK is checkpoint_id (UUID), not checkpoint_index.
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('id, sort_order')
    .eq('lesson_id', lessonId)
    .order('sort_order', { ascending: true });

  for (const cp of checkpoints ?? []) {
    const { data: cpAnswers } = await supabase
      .from('session_answers')
      .select('selected_index, correct')
      .eq('session_id', sessionId)
      .eq('checkpoint_index', cp.sort_order);

    const distribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let totalAnswered = 0;
    let totalCorrect = 0;

    for (const a of cpAnswers ?? []) {
      if (a.selected_index >= 0 && a.selected_index <= 3) {
        distribution[a.selected_index]++;
      }
      totalAnswered++;
      if (a.correct) totalCorrect++;
    }

    // Insert using the correct checkpoint_id FK. Ignore duplicates if session
    // was somehow double-ended (the status guard above prevents this, but belt+suspenders).
    await supabase.from('session_checkpoint_results').insert({
      session_id: sessionId,
      checkpoint_id: cp.id,
      answer_distribution: distribution,
      total_answered: totalAnswered,
      total_correct: totalCorrect,
    });
  }

  // Build final leaderboard
  const { data: allPlayers } = await supabase
    .from('session_players')
    .select('id, display_name, score, lives, status, total_time_ms')
    .eq('session_id', sessionId)
    .order('score', { ascending: false })
    .order('total_time_ms', { ascending: true });

  return (allPlayers ?? []).map((p: any, i: number) => ({
    rank: i + 1,
    playerId: p.id,
    displayName: p.display_name,
    score: p.score,
    lives: p.lives,
    status: p.status,
    totalTimeMs: p.total_time_ms,
  }));
}
