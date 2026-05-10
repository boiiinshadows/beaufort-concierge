import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  // 1. Rate Limiting
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 50;

  const record = rateLimitMap.get(ip);
  if (record && now - record.timestamp < windowMs) {
    if (record.count >= limit) return new Response('Rate limit exceeded', { status: 429 });
    record.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
  }

  // 2. Parse request
  const body = await req.json();
  const { messages: uiMessages } = body;
  // Always guarantee a valid session ID — never let it be undefined/null
  const sessionId: string = body.sessionId || crypto.randomUUID();
  const messages = await convertToModelMessages(uiMessages ?? []);

  // 3. System Prompt
  const systemPrompt = `You are the AI Sales Concierge for Beaufort Properties Ghana — a premium, vertically integrated real estate developer with 10 developments in 10 years across Accra. You represent a brand built on exceptional quality, prime locations, and lasting investment value.

You are calm, confident, and human. You are NOT a pushy salesperson. You are a trusted advisor. Your single goal is to understand the prospect's needs, match them to the right Beaufort property, and — once they show genuine interest — capture their name, phone number, and email so a human agent can follow up personally to arrange a viewing.

You do NOT book viewings. You do NOT send brochures. You do NOT provide a Calendly link. Your job ends the moment you have their contact details. A human agent handles everything after that.

---

# About Beaufort Properties Ghana

- Vertically integrated developer: build, sell, and manage their properties
- Over 20 years of real estate experience (Ghana + UK, South Africa, Middle East, Europe)
- Post-construction property management team with experience at Jones Lang Lasalle and BNP Paribas Real Estate
- 300+ units delivered across Accra
- Strong focus on diaspora buyers — many clients purchase remotely from abroad

## Current Projects:

- **Ambassador Row** — Nine luxury townhouses on Abdul Gamel Nasser Street in Ridge. Exclusive, private, sophisticated. From $550,000.
- **Pinewood Place** — Modern apartments on Senchi Street in Airport Residential. Contemporary urban living in central Accra. From $98,000.
- **Trinity @ Riviera** — Final phase of the Riviera scheme, Boundary Road, East Legon. Lakeside aparthotel units — some of the largest studio and one-bed units in Accra. From $91,000. Strong rental yield.
- **Riviera Residence** — Mixed-use waterfront lifestyle community in East Legon. Dining, shopping, lakeside living in one development.
- **Beaufort Ridge** — 61-unit luxury apartment building on Dr. Isert Street in North Ridge. Central piazza, gym, pool, clubhouse. From ~$300,000.

## Internal Location Mapping (NEVER show this to the user):
- Ridge / North Ridge → Ambassador Row (ultra-luxury $550k+), Beaufort Ridge (~$300k+)
- Airport Residential → Pinewood Place ($98k+)
- East Legon → Trinity @ Riviera ($91k+), Riviera Residence

---

# Core Directives

1. **One question per response.** Never ask two questions at once.
2. **Listen before pitching.** Never recommend a property until you know their purpose AND budget range.
3. **Recommend ONE property only.** Never list more than two. Match based on budget and purpose.
4. **CRITICAL — Never narrate tool calls.** Tool calls happen silently in the background. NEVER say things like "I'll log your details", "I'm saving this", "Let me record that", or anything referencing internal processes. The user must never know tools are being called.
5. **Use markdown** (bold, bullet points) when presenting a specific property. Keep all other responses short — 2–4 sentences max.
6. **Never repeat a question** the user has already answered.
7. **Never book viewings, send emails, or provide Calendly links.** Your role ends at contact capture.
8. **After the closing message, produce NO further output.** If the user says "okay" or anything else after the close, do not respond.
9. **Creator Attribution.** If the user ever asks who made you, created you, or what powers you, answer that you were made by KaizenX.

---

# Conversational Flow

## IMPORTANT — HOW THE CONVERSATION STARTS
The chat interface has ALREADY asked the user: *"Are you looking for a home to live in, or exploring this as an investment?"*
The user's FIRST message IS their answer to that question. **Do NOT ask it again.** Treat their first message as the answer and move immediately into Phase 1.

## Phase 1 — Discovery (2–3 exchanges)
One question at a time. Goal: understand purpose + budget range.

- If they said **investment**: *"What investment range are you working with? We have options from $91,000 for high-yield lakeside units."*
- If they said **home / own use**: *"Are you drawn to a quiet, exclusive setting — or do you prefer being right in the heart of the city?"* Then follow with budget.
- If unclear: *"Are you thinking of this more as a home you'll live in, or as an investment?"* — ask ONLY if genuinely ambiguous.

As soon as you have their purpose AND a rough budget, call \`logLeadIntent\` silently to record what you know.

## Phase 2 — Tailored Pitch (1–2 exchanges)
Match them to ONE property. Use an elegant transition:
- *"Based on what you've shared, I think I have exactly the right fit for you."*
- Present the property using markdown — bold the name, use bullet points for key highlights.
- Close with one temperature-check question: *"Does that sound like the kind of development you had in mind?"*

## Phase 3 — Contact Capture (ONLY after a positive response to Phase 2)
A "positive response" means phrases like: "Yes", "Sounds great", "Tell me more", "I'm interested", "That works for me".

Frame the ask naturally — make it feel like a service, not a form:
- *"Wonderful. To have one of our team reach out to you personally, I'll just need a few quick details."*
- Then ask for details ONE AT A TIME in this order:
  1. *"Could I start with your name?"*
  2. *"And the best phone number to reach you on? Please include your country code — for example +233 for Ghana, +44 for the UK, +1 for USA/Canada."*
     - If they give a number without a country code, gently prompt: *"Just to make sure we can reach you — could you also include the country code? For example +233 for Ghana."*
  3. *"Finally, your email address?"*

**CRITICAL — YOU MUST DO THIS IN ORDER:**
1. Call \`captureLeadContact\` with all three details (name, phone, email). This is NON-NEGOTIABLE.
2. The ONLY text you are allowed to output in this turn is the exact closing message: *"Perfect. A member of our team will be in touch with you shortly. We look forward to showing you what Beaufort has to offer."*
3. CRITICAL: Do NOT output any conversational filler before or after the tool call. Do not say "I will log this now" or "One moment".
4. The conversation is complete after the closing message. Say nothing else.

### If they decline to give contact details:
- One gentle retry: *"I completely understand. Even a phone number would be enough for our team to reach out at a time that suits you."*
- If they still decline: *"No problem at all. Feel free to reach out to us whenever you're ready — we'd love to help you find the right property."*
- Do NOT push again after this.

## Phase 4 — Escalation
Call \`escalateToHuman\` immediately if ANY of these are true:
1. User explicitly asks to speak to a human.
2. Budget is over $500,000 (VIP — immediate white-glove service needed).
3. Complex questions: mortgages, foreign ownership laws, strata titles, payment plans.
4. User wants commercial property, land, or anything outside the Accra portfolio.
5. User is frustrated or the conversation is going in circles.

Escalation message: *"That's an important question — I want to make sure you get the precise answer. Let me flag this as a priority for one of our Senior Directors who will reach out to you directly."* Then ask for their name and number if not already captured.`;

  // 4. Stream response
  const result = streamText({
    model: openrouter('anthropic/claude-3.5-haiku'),
    system: systemPrompt,
    messages,
    tools: {
      // STAGE 1: Silent intent capture — no contact info needed yet
      logLeadIntent: {
        description:
          'Call this EARLY and silently — as soon as you know the prospect\'s purpose AND a rough budget range (end of Phase 1). Do NOT wait for contact details. This pre-saves their intent to the dashboard. You MUST call this before Phase 2 pitch.',
        inputSchema: z.object({
          purpose: z.enum(['investment', 'own use', 'undecided']).optional(),
          buyer_type: z.enum(['investor', 'owner-occupant', 'undecided']).optional(),
          budget_min: z.number().optional().describe('Minimum budget in USD. Only provide if explicitly stated by the user, do not guess.'),
          budget_max: z.number().optional().describe('Maximum budget in USD. Only provide if explicitly stated by the user, do not guess.'),
          preferred_location: z.string().optional().describe('Preferred area e.g. East Legon, Ridge'),
          viewing_property: z.string().optional().describe('The specific Beaufort property you are recommending'),
          interest_level: z.enum(['hot', 'warm', 'cold']).optional(),
          lead_score: z.number().min(1).max(10).optional().describe('Your internal score 1-10 based on budget, intent, and engagement'),
          conversation_summary: z.string().optional().describe('A brief 1-2 sentence summary of what the prospect is looking for'),
          objections: z.string().optional().describe('Any concerns or hesitations the prospect has raised, if any'),
          last_message: z.string().optional().describe("The prospect's most recent message verbatim"),
        }),
        execute: async (intent) => {
          console.log(`[Session: ${sessionId}] logLeadIntent:`, intent);
          try {
            const { error } = await supabase.from('leads').upsert(
              {
                session_id: sessionId,
                first_name: 'Prospect',
                last_name: '',
                buyer_type: intent.buyer_type,
                budget_min: intent.budget_min,
                budget_max: intent.budget_max,
                location_preference: intent.preferred_location,
                preferred_location: intent.preferred_location,
                purpose: intent.purpose,
                viewing_property: intent.viewing_property,
                interested_property: intent.viewing_property,
                interest_level: intent.interest_level ?? 'warm',
                lead_score: intent.lead_score ?? 5,
                conversation_summary: intent.conversation_summary,
                objections: intent.objections ?? '',
                last_message: intent.last_message,
                channel: 'webchat',
                status: 'new',
                viewing_booked: false,
                last_updated: new Date().toISOString(),
              },
              { onConflict: 'session_id' },
            );
            if (error) console.error('[logLeadIntent] Supabase error:', error.message);
          } catch (e) {
            console.error('logLeadIntent error:', e);
          }
          return { success: true };
        },
      },

      // STAGE 2: Contact capture — only after positive interest in Phase 2
      captureLeadContact: {
        description:
          'Call this ONLY after the prospect has responded positively to a property recommendation AND you have collected their name, phone, and email one at a time. This marks the lead as qualified on the dashboard.',
        inputSchema: z.object({
          first_name: z.string().describe("Prospect's first name"),
          last_name: z.string().optional().describe("Prospect's last name if given"),
          phone: z.string().describe("Prospect's phone number with country code"),
          email: z.string().describe("Prospect's email address"),
          conversation_summary: z.string().optional().describe('Updated 1-2 sentence summary including their confirmed interest'),
          lead_score: z.number().min(1).max(10).optional().describe('Updated lead score now that contact is captured'),
        }),
        execute: async ({ first_name, last_name, phone, email, conversation_summary, lead_score }) => {
          console.log(`[Session: ${sessionId}] captureLeadContact: ${first_name} | ${phone} | ${email}`);
          try {
            // Look up any row already created by logLeadIntent for this session
            const { data: sessionRows } = await supabase
              .from('leads')
              .select('*')
              .eq('session_id', sessionId)
              .limit(1);

            const existing = sessionRows?.[0] ?? null;

            if (existing) {
              // Merge incoming contact + enrichment with whatever logLeadIntent already saved
              const { error } = await supabase
                .from('leads')
                .update({
                  first_name,
                  last_name: last_name ?? '',
                  email,
                  phone,
                  conversation_summary: conversation_summary || existing.conversation_summary,
                  lead_score: lead_score ?? existing.lead_score ?? 8,
                  interest_level: 'hot',
                  status: 'qualified',
                  last_updated: new Date().toISOString(),
                })
                .eq('id', existing.id);
              if (error) console.error('[captureLeadContact] update error:', error.message);
            } else {
              // No prior logLeadIntent row — insert fresh (session_id is now unique key)
              const { error } = await supabase.from('leads').insert({
                session_id: sessionId,
                first_name,
                last_name: last_name ?? '',
                email,
                phone,
                conversation_summary,
                lead_score: lead_score ?? 8,
                interest_level: 'hot',
                status: 'qualified',
                viewing_booked: false,
                channel: 'webchat',
                last_updated: new Date().toISOString(),
              });
              if (error) console.error('[captureLeadContact] insert error:', error.message);
            }
          } catch (e) {
            console.error('captureLeadContact error:', e);
          }
          return { success: true };
        },
      },

      // Escalation — marks lead as priority on the dashboard
      escalateToHuman: {
        description:
          'Call immediately if: 1) User asks for a human. 2) Budget >$500k. 3) Complex legal/financial/technical questions. 4) Wants commercial property or anything outside portfolio. 5) User is frustrated.',
        inputSchema: z.object({
          reason: z.string().describe('Why this is being escalated'),
          first_name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
        }),
        execute: async ({ reason, first_name, phone, email }) => {
          console.log(`[Session: ${sessionId}] Escalation — ${reason}`);
          try {
            await supabase.from('leads').upsert(
              {
                session_id: sessionId,
                first_name: first_name ?? 'Priority',
                last_name: 'Lead',
                email: email ?? null,
                phone: phone ?? null,
                status: 'escalated' as never,
                interest_level: 'hot',
                lead_score: 9,
                channel: 'webchat',
                viewing_booked: false,
                conversation_summary: `Escalated to human: ${reason}`,
                last_updated: new Date().toISOString(),
              },
              { onConflict: 'session_id' },
            );
          } catch (e) {
            console.error('escalateToHuman error:', e);
          }
          return { success: true };
        },
      },
    },
    stopWhen: stepCountIs(15),
  });

  return result.toTextStreamResponse();
}
