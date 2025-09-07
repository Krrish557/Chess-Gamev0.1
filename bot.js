/**
 * bot.js
 * - Minimal Telegram bot that sends a message with a Web App button opening the mini app.
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=<token> PUBLIC_URL=https://your-public-url npm run bot
 *
 * The bot will respond to /start and /play commands.
 *
 * Note: Make sure PUBLIC_URL is an HTTPS URL reachable by Telegram.
 */

const TelegramBot = require('node-telegram-bot-api');

const token = "8028428488:AAGtFlOeK9YmzeVDJaIgmYDwXU7XPbfRquQ";
const PUBLIC_URL = "https://353c2860e5ff.ngrok-free.app"; // e.g. https://abcd.ngrok.io

if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set. Exiting.');
    process.exit(1);
}
if (!PUBLIC_URL) {
    console.error('PUBLIC_URL is not set. Exiting.');
    process.exit(1);
}

// Use polling mode for simplicity in development.
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const reply = `Welcome. Click Play to open the chess mini app (opens inside Telegram).`;
    const button = {
        reply_markup: {
            inline_keyboard: [[{
                text: 'Play Chess (Mini App)',
                // web_app is supported by Telegram clients — opens the URL inside Telegram
                web_app: { url: `${PUBLIC_URL}/` }
            }]]
        }
    };
    bot.sendMessage(chatId, reply, button);
});

bot.onText(/\/play/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Opening mini app...', {
        reply_markup: {
            inline_keyboard: [[{ text: 'Open Chess', web_app: { url: `${PUBLIC_URL}/` } }]]
        }
    });
});

bot.on('message', (msg) => {
    // optional: handle helpful debug messages
    if (msg.text && msg.text.startsWith('/')) return; // ignore commands handled above
    // small convenience
    if (msg.text && msg.text.toLowerCase().includes('help')) {
        bot.sendMessage(msg.chat.id, 'Use /play or click the Play Chess button to start.');
    }
});

console.log('Telegram bot started. Waiting for /start or /play');
