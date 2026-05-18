import { NextRequest, NextResponse } from 'next/server'
import { geminiStream } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { idea, format } = await req.json() as { idea: string; format?: string }

  if (!idea?.trim()) {
    return NextResponse.json({ error: 'idea is required' }, { status: 400 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured — add it to your Vercel environment variables' }, { status: 503 })
  }

  const formatHint =
    format === 'talking-head' ? 'Talking-head — owner speaks directly to camera, raw and conversational. No voiceover polish, no cuts implied. Just the owner talking.' :
    format === 'b-roll'       ? 'Voiceover over b-roll footage. Conversational narration, not a commercial. Sound like you\'re telling a friend, not selling.' :
    format === 'tutorial'     ? 'Tutorial. Use "here\'s what I actually do" language, not "step 1, step 2". Keep it casual and real.' :
    format === 'text-overlay' ? 'Text overlay — ultra-short punchy lines only. Each sentence is its own screen. Max 5–6 words per line. Punchy as hell.' :
    format === 'pov'          ? 'POV format. Start with "POV:" — put the viewer in the moment as a customer. Describe the experience as if it\'s happening to them right now. Second-person throughout.' :
    format === 'storytime'    ? 'Story time format. Open with something like "okay real talk" or "not me gatekeeping this anymore". Tell one specific incident or moment — customer story, business origin, behind the scenes reveal. Make it feel like gossip you couldn\'t keep to yourself.' :
    format === 'hottake'      ? 'Hot take format. Lead with a spicy, slightly controversial opinion about your industry or category — something that makes people go "wait actually." Build your case in 3 sentences. Your business is the proof that you\'re right.' :
    format === 'countdown'    ? 'Countdown format. Pick 3, 5, or 7. Title line: "[Number] things about [business type] that nobody tells you" or similar. Each point is one punchy sentence with a specific detail. Make them feel like insider info.' :
    'Casual spoken script, TikTok style. No specific format required — just make it real and addictive.'

  const stream = geminiStream({
    system: `You write TikTok video scripts for small business owners that actually make people stop scrolling and come in. You understand TikTok culture in 2025-2026 — not just the slang, but the rhythm, the pacing, and the psychological hooks that work on the app.

CURRENT TIKTOK LANGUAGE — use these naturally, never forced. Pick 2-4 per script max:
- Openers: "okay real talk", "POV:", "not me actually", "I need to be honest", "story time but fast", "hot take:", "this is your sign", "we don't talk about this enough", "I was today years old", "not gonna lie", "unfiltered opinion:", "real talk no filter"
- Energy words: "ate", "understood the assignment", "it's giving", "main character energy", "bussin", "snapped", "serving", "hits different", "core memory", "aura points", "the vibe is immaculate", "delulu but make it work", "that's so real"
- Emphasis: "no cap", "fr fr", "lowkey", "highkey", "literally", "actually", "genuinely", "I'm in my [X] era", "rent free", "cooked", "it's giving [X] vibes"
- Trust builders: "everyone needs to know about this", "I had to share this", "this changed everything", "game changer", "I'm not gatekeeping this anymore", "secret weapon", "this one's for [relatable group]"
- Endings: "this is your sign to", "drop everything and", "don't sleep on this", "you actually need this", "follow for more of this", "save this for later"

PROVEN VIRAL HOOK FORMULAS — pick one that fits, use it as the first line:
- "POV: you finally found [exact thing customer wants]"
- "I can't believe I gatekept [business] for this long"
- "not me thinking [common misconception] until I tried [business type]"
- "[Number] things about [business type] nobody actually tells you"
- "okay real talk — [specific relatable pain point]? [business] literally fixed that"
- "this is your sign to stop [bad alternative] and just go to [type of business]"
- "the way [business] understood the assignment fr"
- "we are not gatekeeping [business] anymore"
- "I'm in my [relevant] era and [business] is why"

TIKTOK RHYTHM RULES:
- First 1–2 words: impossible to scroll past. Create FOMO, curiosity, or deep relatability.
- Total length: 15–25 seconds of spoken content (short = more rewatches = more reach)
- Use rhythm: short punchy line. Then a slightly longer one that builds context. Then the satisfying payoff.
- Sound unscripted. Incomplete sentences are fine. Use "okay so", "like", "literally", mid-sentence pivots.
- Be specific and local: "our $14 birria tacos on Sixth Street" beats "our affordable food". Specifics build trust.
- End strong: make NOT taking action feel like the mistake. Don't ask, tell. "You need to come in this week."

NEVER WRITE:
- "as a business owner" / "our team is dedicated" / "we pride ourselves" / "quality service" / "years of experience"
- Generic CTAs: "visit us today" / "check out our website" / "give us a call"
- Bullet points, numbered lists, headers, stage directions, "[hook]" markers, or anything in brackets
- Questions as openers ("Are you looking for...?" gets skipped every time)`,
    messages: [{ role: 'user', parts: [{ text: `Write a TikTok video script based on this idea:\n"${idea}"\n\nFormat: ${formatHint}\n\nOutput only the spoken words. No labels, no stage directions, no brackets. Just the script.` }] }],
    maxTokens: 450,
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
