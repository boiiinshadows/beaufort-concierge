import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        leads ( first_name, last_name, email, phone ),
        properties ( name, location )
      `)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Supabase error fetching bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    return NextResponse.json({ bookings: data }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lead_id, property_id, scheduled_at } = body;

    if (!lead_id || !property_id || !scheduled_at) {
      return NextResponse.json({ error: 'lead_id, property_id, and scheduled_at are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        lead_id,
        property_id,
        scheduled_at,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting booking:', error);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking: data }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
