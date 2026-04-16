import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: sessionId } = req.query;

  try {
    const { playerId, questionIndex, selectedIndex, runScore } = req.body;

    if (!playerId || questionIndex === undefined || selectedIndex === undefined) {
      return res.status(400).json({ error: 'playerId, questionIndex, and selectedIndex are required' });
    }

    const coinScore = Math.max(0, Math.min(runScore || 0, 500));

    // Session must be running (not lobby, not ended)
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, status, lesson_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'running') {
      return res.status(400).json({ error: 'Session is not accepting answers' });
    }

    // Player must be alive
    const { data: player, error: playerError } = await supabase
      .from('session_players')
      .select('id, score, lives, status')
      .eq('id', playerId)
      .eq('session_id', sessionId)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.status !== 'alive') {
      return res.status(400).json({ error: 'Player is eliminated' });
    }

    // Dedup: one answer per (player, questionIndex). DB UNIQUE constraint will
    // also enforce this, but check first for a clean 400 instead of 500.
    const { data: existing } = await supabase
      .from('session_answers')
      .select('id')
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .eq('checkpoint_index', questionIndex)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Already answered this question' });
    }

    // Resolve the question's correct answer by sort_order = questionIndex
    const { data: checkpoint } = await supabase
      .from('checkpoints')
      .select('correct_index, fact')
      .eq('lesson_id', session.lesson_id)
      .eq('sort_order', questionIndex)
      .single();

    if (!checkpoint) {
      return res.status(400).json({ error: 'Question not found' });
    }

    const correctIndex = checkpoint.correct_index;
    const fact = checkpoint.fact ?? '';
    const correct = selectedIndex === correctIndex;

    // Flat scoring: correct = 100, wrong = 0. Plus coin score from run.
    // (Time-pressure bonus removed since per-player timing made it unfair.)
    const pointsAwarded = correct ? 100 : 0;

    const newLives = correct ? player.lives : player.lives - 1;
    const newStatus = newLives <= 0 ? 'eliminated' : 'alive';
    const newScore = player.score + pointsAwarded + coinScore;

    await supabase
      .from('session_players')
      .update({ score: newScore, lives: newLives, status: newStatus })
      .eq('id', playerId);

    await supabase.from('session_answers').insert({
      session_id: sessionId,
      player_id: playerId,
      checkpoint_index: questionIndex,
      selected_index: selectedIndex,
      correct,
      points_awarded: pointsAwarded,
      time_taken_ms: 0,
    });

    return res.status(200).json({
      correct,
      correctIndex,
      pointsAwarded,
      livesRemaining: newLives,
      newStatus,
      fact,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
