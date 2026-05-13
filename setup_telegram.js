// setup_telegram.js
// Run this script to configure your Telegram bot webhook.
// Usage: node setup_telegram.js

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Telegram Bot Webhook Setup\n');

rl.question('Enter your Telegram Bot Token: ', (token) => {
  rl.question('Enter your Medhashi API Worker URL (e.g. https://medhashi-api.medhashi.workers.dev): ', async (workerUrl) => {
    rl.question('Enter a Webhook Secret (optional, press Enter to skip): ', async (secret) => {
      const webhookUrl = `${workerUrl.replace(/\/$/, '')}/api/telegram/webhook`;
      console.log(`\nSetting webhook to: ${webhookUrl}`);
      
      try {
        const url = new URL(`https://api.telegram.org/bot${token}/setWebhook`);
        url.searchParams.append('url', webhookUrl);
        if (secret) {
          url.searchParams.append('secret_token', secret);
        }

        const res = await fetch(url.toString());
        const data = await res.json();

        if (data.ok) {
          console.log('\n✅ Webhook successfully set!');
          console.log('\nIMPORTANT: Don\'t forget to add your secrets to Cloudflare:');
          console.log(`npx wrangler secret put TELEGRAM_BOT_TOKEN`);
          if (secret) {
            console.log(`npx wrangler secret put TELEGRAM_WEBHOOK_SECRET`);
          }
        } else {
          console.error('\n❌ Failed to set webhook:', data.description);
        }
      } catch (e) {
        console.error('\n❌ Error:', e.message);
      } finally {
        rl.close();
      }
    });
  });
});
