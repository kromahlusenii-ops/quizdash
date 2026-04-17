import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';

async function getUserId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id: sessionId } = req.query;

  try {
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, status, lesson_id, created_at')
      .eq('id', sessionId)
      .eq('instructor_id', userId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get questions for the lesson
    const { data: checkpoints } = await supabase
      .from('checkpoints')
      .select('id, sort_order, question, options, correct_index')
      .eq('lesson_id', session.lesson_id)
      .order('sort_order', { ascending: true });

    // Get all answers for this session
    const { data: answers } = await supabase
      .from('session_answers')
      .select('checkpoint_index, selected_index, correct')
      .eq('session_id', sessionId);

    // Build per-question results (from source-of-truth tables, not the cache)
    const results = (checkpoints ?? []).map((cp: any) => {
      const qAnswers = (answers ?? []).filter(
        (a: any) => a.checkpoint_index === cp.sort_order
      );

      const distribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
      let totalAnswered = 0;
      let totalCorrect = 0;

      for (const a of qAnswers) {
        if (a.selected_index >= 0 && a.selected_index <= 3) {
          distribution[a.selected_index]++;
        }
        totalAnswered++;
        if (a.correct) totalCorrect++;
      }

      return {
        id: cp.id,
        question: cp.question,
        options: cp.options,
        correct_index: cp.correct_index,
        answer_distribution: distribution,
        total_answered: totalAnswered,
        total_correct: totalCorrect,
      };
    });

    // Build leaderboard
    const { data: players } = await supabase
      .from('session_players')
      .select('id, display_name, score, lives, status')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });

    const leaderboard = (players ?? []).map((p: any, i: number) => ({
      rank: i + 1,
      displayName: p.display_name,
      score: p.score,
      lives: p.lives,
      survived: p.status === 'alive' || p.status === 'completed',
    }));

    return res.status(200).json({
      session: {
        id: session.id,
        status: session.status,
        createdAt: session.created_at,
        totalQuestions: checkpoints?.length ?? 0,
        totalPlayers: players?.length ?? 0,
      },
      results,
      leaderboard,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
