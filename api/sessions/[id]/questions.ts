import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: sessionId } = req.query;

  try {
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('lesson_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { data: checkpoints, error: cpError } = await supabase
      .from('checkpoints')
      .select('question, options, sort_order')
      .eq('lesson_id', session.lesson_id)
      .order('sort_order', { ascending: true });

    if (cpError) {
      return res.status(400).json({ error: cpError.message });
    }

    // Do NOT return correct_index or fact — those come back only via /answer
    // after the student submits. Otherwise DevTools reveals the quiz answers.
    return res.status(200).json({
      questions: (checkpoints ?? []).map((cp: any, i: number) => ({
        index: i,
        question: cp.question,
        options: cp.options,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
