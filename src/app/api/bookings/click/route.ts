import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('leads')
      .update({
        viewing_booked: true,
        status: 'viewing_scheduled',
        last_updated: new Date().toISOString(),
      })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Supabase error updating viewing_booked:', error);
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
