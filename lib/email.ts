import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

const FROM = 'BrandLift <contact@brandlift.dev>'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://brandlift.dev'

function unsubscribeUrl(email: string) {
  const token = Buffer.from(email).toString('base64url')
  return `${BASE_URL}/api/unsubscribe?t=${token}`
}

function footer(email: string) {
  return `
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
      You're receiving this because you signed up at brandlift.dev.<br/>
      <a href="${unsubscribeUrl(email)}" style="color:#9ca3af;">Unsubscribe</a>
    </div>
  `
}

function wrap(content: string, email: string) {
  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:40px;max-width:600px;width:100%;">
            <tr><td>
              <div style="margin-bottom:32px;">
                <span style="font-size:20px;font-weight:800;letter-spacing:-0.04em;color:#6366f1;">BrandLift</span>
              </div>
              ${content}
              ${footer(email)}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
  `
}

export async function sendWelcomeEmail(email: string) {
  return getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Welcome to BrandLift 👋',
    html: wrap(`
      <h1 style="font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.03em;margin:0 0 16px;">
        You're in. Let's build your brand.
      </h1>
      <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
        Hey! Thanks for joining BrandLift — the AI-powered studio that turns your ideas into scroll-stopping social content.
      </p>
      <p style="font-size:15px;color:#6b7280;line-height:1.7;margin:0 0 24px;">
        Here's what you can do right now:
      </p>
      <ul style="padding-left:20px;margin:0 0 28px;color:#374151;font-size:15px;line-height:2;">
        <li>Upload a video and watch AI enhance and export it for TikTok, Reels, and Shorts</li>
        <li>Generate viral hooks, scripts, and captions in seconds</li>
        <li>Build a full website from a single sentence</li>
        <li>Plan a month of content in under 5 minutes</li>
      </ul>
      <a href="${BASE_URL}/dashboard"
        style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;">
        Open BrandLift →
      </a>
      <p style="font-size:13px;color:#9ca3af;margin-top:28px;line-height:1.6;">
        Reply to this email anytime — I read every message.
      </p>
    `, email),
  })
}

export async function sendProductUpdateEmail(emails: string[], subject: string, headline: string, body: string, ctaLabel = 'See it in action →') {
  // Resend batch limit is 100 per call
  const results = []
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100)
    const res = await getResend().batch.send(
      batch.map(email => ({
        from: FROM,
        to: email,
        subject,
        html: wrap(`
          <h1 style="font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.03em;margin:0 0 16px;">
            ${headline}
          </h1>
          <div style="font-size:15px;color:#374151;line-height:1.75;margin:0 0 28px;">
            ${body}
          </div>
          <a href="${BASE_URL}/dashboard"
            style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;">
            ${ctaLabel}
          </a>
        `, email),
      }))
    )
    results.push(res)
  }
  return results
}

export async function sendWeeklyTipEmail(emails: string[], tip: WeeklyTip) {
  const results = []
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100)
    const res = await getResend().batch.send(
      batch.map(email => ({
        from: FROM,
        to: email,
        subject: `💡 ${tip.subject}`,
        html: wrap(`
          <div style="display:inline-block;background:rgba(99,102,241,0.08);color:#6366f1;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:4px 10px;border-radius:20px;margin-bottom:20px;">
            Weekly Tip
          </div>
          <h1 style="font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.03em;margin:0 0 16px;">
            ${tip.headline}
          </h1>
          <div style="font-size:15px;color:#374151;line-height:1.8;margin:0 0 24px;">
            ${tip.body}
          </div>
          ${tip.example ? `
          <div style="background:#f3f4f6;border-left:3px solid #6366f1;border-radius:6px;padding:16px 20px;margin:0 0 28px;">
            <p style="font-size:13px;font-weight:600;color:#6366f1;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">Example</p>
            <p style="font-size:14px;color:#374151;margin:0;line-height:1.7;">${tip.example}</p>
          </div>` : ''}
          <a href="${BASE_URL}/dashboard"
            style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;">
            Try it in BrandLift →
          </a>
        `, email),
      }))
    )
    results.push(res)
  }
  return results
}

export interface WeeklyTip {
  subject: string
  headline: string
  body: string
  example?: string
}

export const WEEKLY_TIPS: WeeklyTip[] = [
  {
    subject: 'The hook that stops the scroll',
    headline: 'Your first 2 seconds are everything',
    body: `On TikTok and Reels, 65% of viewers decide whether to keep watching in the first 2 seconds. The fastest way to win that window: lead with a bold, specific claim or a question that makes them feel like they're about to miss something. <br/><br/>Vague hooks ("I tried something new today") get scrolled. Specific hooks ("I got 40 leads from one reel — here's the exact script") get watched.`,
    example: 'Bad: "Here\'s a tip for your business." → Good: "This one change doubled my Instagram reach in 7 days."',
  },
  {
    subject: 'Post at the right time — every time',
    headline: 'Timing isn\'t luck. It\'s a system.',
    body: `Most creators post when they have time, not when their audience is online. Check your platform analytics for your top 3 highest-engagement posts and look at what time they went live. That's your window.<br/><br/>For most small businesses: 7–9am and 7–9pm local time consistently outperform midday posts. Test both, pick the winner, then schedule religiously for 4 weeks before changing anything.`,
    example: 'Use BrandLift\'s content planner to batch-write 4 posts in one sitting, then drip them out at optimal times.',
  },
  {
    subject: 'Repurpose one video into 5 pieces of content',
    headline: 'Work once. Post five times.',
    body: `A single 60-second talking-head video contains more content than most people realize. Here's the breakdown:<br/><br/>
      1. The full video → TikTok / Reel<br/>
      2. The best 10-second clip → Stories<br/>
      3. The key point → a text post / tweet thread<br/>
      4. The transcript → a blog intro<br/>
      5. The hook line → a quote graphic<br/><br/>
    The same effort. Five touchpoints. BrandLift's repurpose tool does steps 2–5 automatically.`,
  },
  {
    subject: 'Reviews are your best content',
    headline: 'Your happiest customer is your best marketer',
    body: `User-generated content and testimonials convert 4× better than branded content. Yet most businesses never ask for them.<br/><br/>Simple system: after every completed job or purchase, text or email the client: "Would you be willing to leave a quick Google review? Here's the link." Then screenshot the best ones and post them weekly. No editing required. No script needed. Just social proof in its rawest form.`,
    example: '"Working with [you] was the best decision I made this year" → post that as a carousel with your logo. Done.',
  },
  {
    subject: 'The 3-second text rule',
    headline: 'If they can\'t read it in 3 seconds, it\'s gone',
    body: `85% of social video is watched without sound. That means your on-screen text is doing all the heavy lifting.<br/><br/>Rule: if the text on any single frame takes more than 3 seconds to read, cut it in half. Use one idea per screen. Bigger font. More contrast. Less decoration.<br/><br/>BrandLift auto-generates captions optimised for this — but if you're designing your own graphics, this one rule will immediately boost watch time.`,
  },
  {
    subject: 'The algorithm isn\'t your enemy',
    headline: 'Stop blaming the algorithm. Start understanding it.',
    body: `Every platform algorithm does one thing: maximise time on platform. That means it rewards content that gets watched all the way through and shared.<br/><br/>So the question isn't "how do I game the algorithm" — it's "how do I make something people actually finish watching?" Answer: shorter videos, strong hooks, pattern interrupts (cut the pace, add text overlays, change the angle), and a clear payoff at the end.`,
    example: 'Add a "wait for it…" text overlay at the 10-second mark of your next video and watch your completion rate jump.',
  },
  {
    subject: 'One niche beats all the niches',
    headline: 'The riches are in the niches (yes, really)',
    body: `"Marketing for businesses" gets ignored. "Marketing for wedding photographers in Texas" gets followed.<br/><br/>The more specific your content, the more the right people feel like you're speaking directly to them — and they share it with others who feel the same. You don't need a massive audience. You need the right 500 people who will eventually become customers and referrers.`,
    example: 'Take your most generic post this week and rewrite it for one specific type of customer. See what happens.',
  },
  {
    subject: 'B-roll is the secret weapon',
    headline: 'Nobody wants to watch a talking head for 60 seconds',
    body: `The easiest way to make your videos feel more professional: cut away from your face every 5–8 seconds to show something relevant — your product, your workspace, your process, your hands doing the thing you're explaining.<br/><br/>This keeps the visual energy high and gives viewers a reason to keep watching. Even phone footage of your hands typing, cooking, building, or designing makes a massive difference compared to a static locked-off shot.`,
  },
]
