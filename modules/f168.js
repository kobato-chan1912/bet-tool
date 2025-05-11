const axios = require('axios');
const CryptoJS = require('crypto-js');
const md5 = require('md5');
let success = [];
const helper = require("../helpers/helper.js");
const { HttpsProxyAgent } = require('https-proxy-agent');
const pLimit = require('p-limit');
const chalk = require('chalk');
const { mod } = require('telegram/Helpers.js');


// Thông tin cấu hình
const information = {
    site: "f168",
    endpoint: "https://api-freecode-f168.freecodevip.org",
    key_free: "f168apt.code.free-code.f168@2030$F168ff",
    cskh_url: "https://f1680.pro/trangchu",
    cskh_home: "https://f1680.pro/trangchu",
    follow_code: "https://t.me/f168freecode"
};

// Hàm mã hóa
const encrypt = (text) => {
    const md5Key = md5(information.key_free).toLowerCase();
    return CryptoJS.AES.encrypt(text, md5Key).toString();
};

// Hàm giải mã (nếu cần)
const decrypt = (cipherText) => {
    const md5Key = md5(information.key_free).toLowerCase();
    const bytes = CryptoJS.AES.decrypt(cipherText, md5Key);
    return bytes.toString(CryptoJS.enc.Utf8);
};

// Lấy token captcha
const getCaptchaToken = async (proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`);
    try {
        const response = await axios.get(
            `${information.endpoint}/api/get-verification-code?site=${information.site}`,
            {
                headers: {
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
                    'content-type': 'application/json',
                    'origin': 'https://f168.pro/',
                    'priority': 'u=1, i',
                    'referer': 'https://f168.pro/',
                    'sec-ch-ua': '"Chromium";v="135", "Not:A-Brand";v="24", "Google Chrome";v="135"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'cross-site',
                    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/135.0.7049.53 Mobile/15E148 Safari/604.1'
                },
                httpsAgent: agent
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error getting captcha token:', error.message);
        throw error;
    }
};


// Cộng điểm và kiểm tra mã code
const addPointClient = async (promoCode, captchaInput, clientToken, playerId, proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port

    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
        'content-type': 'application/json',
        'origin': 'https://f168.pro/',
        'priority': 'u=1, i',
        'referer': 'https://f168.pro/',
        'sec-ch-ua': '"Chromium";v="135", "Not:A-Brand";v="24", "Google Chrome";v="135"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/135.0.7049.53 Mobile/15E148 Safari/604.1'
    };

    const objParam = { promo_code: promoCode };
    const encryptedKey = encrypt(JSON.stringify(objParam));
    const body = {
        key: encryptedKey,
        captchaCode: captchaInput,
        token: clientToken,
        deviceType: 'mobile' // Giả lập desktop
    };

    try {
        const response = await axios.post(
            `${information.endpoint}/client?player_id=${playerId}&promo_code=${promoCode}&site=${information.site}`,
            body,
            { headers, httpsAgent: agent }
        );
        return response.data;
    } catch (error) {
        console.error('Error adding points:', error.message);
        throw error;
    }
};


const enterF168 = async (promoCode, playerId, proxyString) => {
    try {
        // Bước 1: Lấy token và captcha
        const captchaData = await getCaptchaToken(proxyString);
        const captchaBase64 = captchaData.captchaUrl;
        const clientToken = captchaData.token;

        // Bước 2: Giải captcha
        let captchaSolution = await helper.solveCaptchaWithAntiCaptcha(captchaBase64);
        captchaSolution = captchaSolution.toUpperCase();

        // Bước 3: Kiểm tra code và cộng điểm
        // console.log('Checking promo code and adding points for player:', playerId);
        const result = await addPointClient(promoCode, captchaSolution, clientToken, playerId, proxyString);
        console.log(`F168 nhập code ${promoCode} - ${captchaSolution} cho user ${playerId}:`, result);

        if (result.valid === true) {
            success.push({
                user: playerId,
                msg: result.point
            })
        }

    } catch (error) {
        console.error('Process failed:', error.message);
    }
};



async function processF168(message, client) {
    console.log(chalk.greenBright(`\n📥 Code mới từ F168`));
    let messageContent = message.message;
    let codes = await helper.processText(messageContent, 8);
    // delete phatcode
    codes = codes.filter(code => code !== 'phatcode');

    if (codes.length === 0) {
        const imgPath = await helper.downloadMedia(message, client);
        codes = await helper.processImage(imgPath, 8);
    }

    if (codes.length === 0) {
        console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
        return;
    }



    const f168Users = await helper.readFileToArray("config/f168.txt");
    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    const tasks = [];
    success = [];
    for (const user of f168Users) {
        let proxyString = await helper.getRandomProxy(); // Proxy dạng user:pass@ip:port
        let code = helper.getRandomElement(codes);
        let [username, teleId] = user.split(/\s+/);
        tasks.push(limit(() => enterF168(code, username, proxyString)));
    }

    await Promise.all(tasks);

    let summaryMsg = "Code mới F168 đây\n";
    // 
    for (const ele of success) {
        await helper.processDoneUser("./config/f168.txt", "./output/f168-done.txt", ele.user, ele.msg, 0);
        summaryMsg += `${ele.user} | ${ele.msg}\n`;
    }
    // 
    if (success.length > 0) {
        // Giả sử dùng chatId từ phần tử đầu tiên
        const chatId1 = -1002544552541;
        const chatId2 = -1002613344439
        await helper.sendTelegramMessage(chatId1, summaryMsg.trim());
        await helper.sendTelegramMessage(chatId2, summaryMsg.trim());
    }

}

module.exports = {
    processF168
};