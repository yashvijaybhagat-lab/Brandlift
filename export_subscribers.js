/**
 * Export newsletter subscribers from Supabase → recipients.csv
 *
 * Requires in .env:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Settings → API → service_role key)
 *
 * Usage:
 *   node export_subscribers.js
 *   node export_subscribers.js custom_output.csv
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_FILE  = process.argv[2] || "recipients.csv";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("⬇️  Fetching subscribers from Supabase...");

  const { data, error } = await supabase
    .from("subscribers")
    .select("email, subscribed_at")
    .order("subscribed_at", { ascending: true });

  if (error) {
    console.error("❌ Supabase error:", error.message);
    process.exit(1);
  }

  if (!data.length) {
    console.log("⚠️  No subscribers found.");
    process.exit(0);
  }

  const csv = ["name,email", ...data.map((r) => `,${r.email}`)].join("\n") + "\n";

  fs.writeFileSync(OUTPUT_FILE, csv, "utf8");
  console.log(`✅ Exported ${data.length} subscriber(s) → ${OUTPUT_FILE}`);
}

main();
