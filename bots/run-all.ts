/**
 * Run both Telegram bots in a single Node process — handy for hosts
 * (like a single Railway service) where running two services is cumbersome.
 *
 * Locally for development we still recommend two separate windows:
 *   npm run bot:client
 *   npm run bot:admin
 */
import "dotenv/config";

async function main() {
  // Import dynamically so a crash in one doesn't take down the entry point
  // until both have a chance to start.
  await import("./client/index");
  await import("./admin/index");
}

main().catch((err) => {
  console.error("[bots] failed to start:", err);
  process.exit(1);
});
