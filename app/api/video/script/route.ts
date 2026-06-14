import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'
import { rateLimit, getIp, tooManyRequests } from '@/lib/rateLimit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const ip = getIp(req)
  const rl = await rateLimit(`script:${ip}`, 15, 60 * 60_000)  // 15/hour
  if (!rl.success) return tooManyRequests(rl.reset)
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in to use this feature' }, { status: 401 })
  }

  try {
    const { idea, format, productDesc } = await req.json() as { idea: string; format?: string; productDesc?: string }

    if (!idea?.trim()) {
      return NextResponse.json({ error: 'idea is required' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured — add it to your Vercel environment variables' }, { status: 503 })
    }

    const formatHint =
      format === 'boss_never'      ? '"My boss would never let me post this but I own the place" format. Start with that energy. Then drop the actual thing — a deal, a secret menu item, a fact about quality that the competition would never admit. Conversational, slightly rebellious, 100% confident.' :
      format === 'math_mathing'    ? 'Price comparison / value format. Make the math undeniable. Compare your price/quality to a competitor or average without naming names. Short, punchy, makes the viewer feel smart for knowing about you.' :
      format === 'types_customers' ? '"Types of customers" format. Name 3 types with affection, not mockery. Each type is one sentence. End by saying you love all of them or that there\'s a type for everyone. Warm, funny, relatable.' :
      format === 'rent_free'       ? '"Lives rent free in my head" format. Tell a specific customer or moment story that genuinely stuck with you. Specific details — time, what they said, what happened. End with warmth. Makes people want to be THAT customer.' :
      format === 'pov'             ? 'POV format. Start with "POV:" — put the viewer in the moment as a customer experiencing the best version of your business. Second-person. Make them feel the moment.' :
      format === 'no_gatekeep'     ? '"No gatekeeping" format. Open with "I\'m not gatekeeping this anymore" or similar. Drop the specifics — price, location, what makes you different. Short, direct, like telling a friend a secret.' :
      format === 'convinced'       ? '"I\'m convinced nobody knows about this place" format — but YOU are the place. Write it from the POV of a raving fan who can\'t believe the place is underrated. Use second-person for the reader, first-person for the business owner. Hyped but real.' :
      format === 'storytime'       ? 'Story time format. One real, specific moment — a customer interaction, something that went wrong, something beautiful that happened. Open with "okay real talk" or a grabby first line. No polish. Feels like gossip you can\'t keep to yourself.' :
      format === 'audacity'        ? 'Bad review / audacity format. Read a real (or fictional but believable) bad review and let it speak for itself. Deadpan reaction. Keep it short — the review is the punchline. Do not get defensive. Let the absurdity win.' :
      format === 'expectvreality'  ? 'Expectation vs Reality format. What you THOUGHT owning this business would be like vs what it actually is. Be honest, funny, and self-aware. End with "worth it" or a real reason why you keep going.' :
      format === 'quit9to5'        ? '"I left my salary" format. Give the number (specific). What people thought. What actually happened. The result. Short, punchy, makes people believe in you.' :
      format === 'dayinlife'       ? '"Day in my life but make it honest" format. Timestamps work well. Be specific about the chaos, the early hours, the weird things. No glamour. End with something that makes the grind feel worth it.' :
      format === 'explaining'      ? '"Explaining to my parents / someone who doesn\'t get it" format. Dialogue style — their question, your answer, their confused follow-up, the punchline. Relatable to any entrepreneur.' :
      format === 'price_reveal'    ? '"What $X gets you" format. Name a specific price point. List exactly what you get — be specific. Compare without naming competitors. Make the viewer feel like they\'re missing out.' :
      format === 'hottake'         ? 'Unpopular opinion format. Start with "unpopular opinion:" or "hot take:". Say something true and slightly controversial about your industry. Build your case in 2-3 lines. Your business is the proof.' :
      'Casual spoken script, Instagram Reels/TikTok style. No specific format required — just make it real, specific, and impossible to scroll past.'

    const script = await geminiGenerate({
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
      messages: [{ role: 'user', parts: [{ text: `Write a TikTok video script based on this idea:\n"${idea}"${productDesc?.trim() ? `\n\nProduct/brand context: ${productDesc.trim()}` : ''}\n\nFormat: ${formatHint}\n\nOutput only the spoken words. No labels, no stage directions, no brackets. Just the script.` }] }],
      maxTokens: 450,
    })

    return NextResponse.json({ script })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
