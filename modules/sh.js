const axios = require('axios');
const CryptoJS = require('crypto-js');
const md5 = require('md5');
const helper = require("../helpers/helper.js");
const { HttpsProxyAgent } = require('https-proxy-agent');
const pLimit = require('p-limit');
const chalk = require('chalk')

// Thông tin cấu hình
const information = {
    site: "shbet",
    endpoint: "https://api-shbet.freecodevip.org",
    key_free: "att.code.free-code.sh-bet@2030$",
    cskh_url: "https://shbetcskh01.pages.dev/",
    cskh_home: "https://shb27.com/trangchu"
};
let success = [];
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
                    'origin': 'https://freecode-shbet.pages.dev/',
                    'priority': 'u=1, i',
                    'referer': 'https://freecode-shbet.pages.dev/',
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

// Kiểm tra mã code
const getCode = async (promoCode, captchaInput, clientToken, proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port

    const headers = {
        'Authorization': clientToken,
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
        'content-type': 'application/json',
        'origin': 'https://freecode-shbet.pages.dev/',
        'priority': 'u=1, i',
        'referer': 'https://freecode-shbet.pages.dev/',
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
            `${information.endpoint}/client/get-code?promo_code=${promoCode}&site=${information.site}`,
            body,
            { headers, httpsAgent: agent }
        );
        return response.data;
    } catch (error) {
        console.error('Error getting code:', error.message);
        throw error;
    }
};

// Cộng điểm cho người chơi
const addPoints = async (playerId, promoCode, proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port

    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
        'content-type': 'application/json',
        'origin': 'https://freecode-shbet.pages.dev/',
        'priority': 'u=1, i',
        'referer': 'https://freecode-shbet.pages.dev/',
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
        key: encryptedKey
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

// Hàm chính thực hiện toàn bộ quy trình
const enterSH = async (promoCode, playerId, proxyString) => {
    try {
        // Bước 1: Lấy token và captcha
        console.log('Getting captcha token...');
        const captchaData = await getCaptchaToken(proxyString);
        const captchaBase64 = captchaData.captchaUrl;
        const clientToken = captchaData.token;

        // Bước 2: Giải captcha
        console.log('Solving captcha...');
        let captchaSolution = await helper.solveCaptchaWithGPT(captchaBase64);
        captchaSolution = captchaSolution.toUpperCase();

        // Bước 3: Kiểm tra code
        console.log('Checking promo code:', promoCode);
        const codeResult = await getCode(promoCode, captchaSolution, clientToken, proxyString);
        console.log('Code check result:', codeResult);

        if (codeResult.valid === true) {
            // Bước 4: Cộng điểm nếu code hợp lệ
            console.log('SH  - Adding points for player:', playerId);
            const addPointResult = await addPoints(playerId, promoCode, proxyString);
            console.log('SH  - Add points result:', addPointResult);

            if (addPointResult.valid === true) {
                success.push({
                    user: playerId,
                    msg: addPointResult.point
                })
                console.log(`SH -  ${addPointResult.point} cho ${addPointResult.player_id}`);
            } else {
                console.log('SH - Failed to add points:', addPointResult.text_mess);
            }
        } else {
            console.log('SH - Invalid promo code:', codeResult.text_mess);
        }

    } catch (error) {
        console.error('Process failed:', error.message);
    }
};

async function processSH(message) {
    console.log(chalk.greenBright(`\n📥 Code mới từ SHBet`));
    let messageContent = message.message;
    let codes11 = await helper.processText(messageContent, 11);
    let codes12 = await helper.processText(messageContent, 12);
    let codes = [...codes11, ...codes12];
    
    if (codes.length === 0) {
        console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
        return;
    }


    const shUsers = await helper.readFileToArray("config/sh.txt");
    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    const tasks = [];
    success = [];
    for (const user of shUsers) {
        let proxyString = await helper.getRandomProxy(); // Proxy dạng user:pass@ip:port
        let code = helper.getRandomElement(codes);
        let [username, teleId] = user.split(/\s+/);
        tasks.push(limit(() => enterSH(code, username, proxyString)));
    }

    await Promise.all(tasks);

    let summaryMsg = "Code mới SHBet đây\n";
    // 
    for (const ele of success) {
        await helper.processDoneUser("./config/sh.txt", "./output/sh-done.txt", ele.user, ele.msg, 0);
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


module.exports = { processSH }