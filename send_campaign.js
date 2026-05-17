/**
 * Send an HTML email campaign (e.g. exported from Canva) to all subscribers.
 *
 * Requires in .env:
 *   FROM_NAME=Your Name
 *   FROM_EMAIL=you@yourdomain.com
 *   EMAIL_PASS=yourPrivateEmailPassword
 *   CAMPAIGN_SUBJECT=Your subject line here
 *
 * Usage:
 *   node send_campaign.js campaign.html
 *   node send_campaign.js campaign.html recipients.csv
 */

require("dotenv").config();
const nodemailer = require("nodemailer");
const { parse }  = require("csv-parse/sync");
const fs         = require("fs");
const path       = require("path");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const SMTP_HOST = "mail.privateemail.com";
const SMTP_PORT = 587;

const FROM_NAME = process.env.FROM_NAME  || "BrandLift";
const FROM_EMAIL = process.env.FROM_EMAIL;
const PASSWORD   = process.env.EMAIL_PASS;
const SUBJECT    = process.env.CAMPAIGN_SUBJECT || "A message from BrandLift";

// ─── ARGS ──────────────────────────────────────────────────────────────────
const htmlFile   = process.argv[2];
const csvFile    = process.argv[3] || "recipients.csv";

if (!htmlFile) {
  console.error("❌ Usage: node send_campaign.js <campaign.html> [recipients.csv]");
  process.exit(1);
}
if (!fs.existsSync(htmlFile)) {
  console.error(`❌ HTML file not found: ${htmlFile}`);
  process.exit(1);
}
if (!fs.existsSync(csvFile)) {
  console.error(`❌ Recipients CSV not found: ${csvFile}  (run node export_subscribers.js first)`);
  process.exit(1);
}
if (!FROM_EMAIL || !PASSWORD) {
  console.error("❌ Missing FROM_EMAIL or EMAIL_PASS in .env");
  process.exit(1);
}

// ─── LOAD ──────────────────────────────────────────────────────────────────
const htmlBody  = fs.readFileSync(htmlFile, "utf8");
const rawCsv    = fs.readFileSync(csvFile, "utf8");
const recipients = parse(rawCsv, { columns: true, skip_empty_lines: true, trim: true });

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`📧 Campaign: "${SUBJECT}"`);
  console.log(`📄 Template: ${path.basename(htmlFile)}`);
  console.log(`📋 Recipients: ${recipients.length} loaded from ${csvFile}\n`);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user: FROM_EMAIL, pass: PASSWORD },
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified\n");
  } catch (err) {
    console.error("❌ SMTP connection failed:", err.message);
    process.exit(1);
  }

  let sent = 0, failed = 0;

  for (const row of recipients) {
    if (!row.email) {
      console.warn("⚠️  Skipping row with no email:", row);
      failed++;
      continue;
    }

    // Replace {{name}} in the HTML if you've templated your Canva export
    const personalised = htmlBody.replace(/\{\{name\}\}/g, row.name || "there");

    try {
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: row.email,
        subject: SUBJECT,
        html: personalised,
        // Plain-text fallback (strip tags)
        text: personalised.replace(/<[^>]+>/g, "").replace(/\s{2,}/g, " ").trim(),
      });
      console.log(`✅ Sent → ${row.email}`);
      sent++;

      // 150ms between sends to stay within rate limits
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      console.error(`❌ Failed → ${row.email}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Done — ${sent} sent, ${failed} failed`);
}

main();
