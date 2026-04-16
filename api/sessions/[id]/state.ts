import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: sessionId } = req.query;

  try {
    // 1. Session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, status, lesson_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 2. Players
    const { data: players } = await supabase
      .from('session_players')
      .select('id, display_name, score, lives, status')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });

    // 3. Total questions
    const { count: totalQuestions } = await supabase
      .from('checkpoints')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_id', session.lesson_id);

    // 4. All answers (for per-player progress + aggregate distribution)
    const { data: answers } = await supabase
      .from('session_answers')
      .select('player_id, checkpoint_index, selected_index, correct')
      .eq('session_id', sessionId);

    // Per-player: answered count + correct count
    const perPlayerStats: Record<string, { answered: number; correct: number }> = {};
    // Aggregate: for each questionIndex, how many picked each option
    const aggregate: Record<number, Record<number, number>> = {};

    for (const a of answers ?? []) {
      const stats = perPlayerStats[a.player_id] ?? { answered: 0, correct: 0 };
      stats.answered++;
      if (a.correct) stats.correct++;
      perPlayerStats[a.player_id] = stats;

      if (!aggregate[a.checkpoint_index]) {
        aggregate[a.checkpoint_index] = { 0: 0, 1: 0, 2: 0, 3: 0 };
      }
      if (a.selected_index >= 0 && a.selected_index <= 3) {
        aggregate[a.checkpoint_index][a.selected_index]++;
      }
    }

    const playersOut = (players ?? []).map((p: any) => ({
      id: p.id,
      displayName: p.display_name,
      score: p.score,
      lives: p.lives,
      status: p.status,
      questionsAnswered: perPlayerStats[p.id]?.answered ?? 0,
      questionsCorrect: perPlayerStats[p.id]?.correct ?? 0,
    }));

    const response: any = {
      session: {
        id: session.id,
        status: session.status,
        totalQuestions: totalQuestions ?? 0,
      },
      players: playersOut,
      aggregate,
    };

    // Final leaderboard when ended
    if (session.status === 'ended') {
      response.finalLeaderboard = playersOut.map((p, i) => ({
        rank: i + 1,
        playerId: p.id,
        displayName: p.displayName,
        score: p.score,
        lives: p.lives,
        status: p.status,
        survived: p.status === 'alive',
      }));
    }

    return res.status(200).json(response);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
