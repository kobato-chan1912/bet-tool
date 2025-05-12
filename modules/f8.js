const axios = require('axios');
const CryptoJS = require('crypto-js');
const md5 = require('md5');
const fs = require('fs').promises;
const helper = require("../helpers/helper.js");
const chalk = require('chalk');
const pLimit = require('p-limit');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const { HttpsProxyAgent } = require('https-proxy-agent');

let success = [];
let failed = [];



// Thông tin cấu hình
const information = {
    site: "f8bet",
    endpoint: "https://api-f8bet.freecodevip.org",
    key_free: "att.code.free-code.f8-bet@2030$",
    cskh_url: "https://f8bet28.vip/cd/cskh",
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
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port
    try {
        const response = await axios.get(
            `${information.endpoint}/api/get-verification-code?site=${information.site}`,
            {
                headers: {
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
                    'content-type': 'application/json',
                    'origin': 'https://f8bet2b.xyz/',
                    'priority': 'u=1, i',
                    'referer': 'https://f8bet2b.xyz/',
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
        'origin': 'https://f8bet2b.xyz/',
        'priority': 'u=1, i',
        'referer': 'https://f8bet2b.xyz/',
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
        deviceType: 'mobile' // Giả lập desktop, có thể thay đổi
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
        'origin': 'https://f8bet2b.xyz/',
        'priority': 'u=1, i',
        'referer': 'https://f8bet2b.xyz/',
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
const enterF8Code = async (promoCode, playerId, proxyString) => {
    try {
        // Bước 1: Lấy token và captcha
        const captchaData = await getCaptchaToken(proxyString);
        const captchaBase64 = captchaData.captchaUrl;
        const clientToken = captchaData.token;

        // Bước 2: Giải captcha
        let captchaSolution = await helper.solveCaptchaWithAntiCaptcha(captchaBase64);
        captchaSolution = captchaSolution.toUpperCase();

        // Bước 3: Kiểm tra code
        const codeResult = await getCode(promoCode, captchaSolution, clientToken, proxyString);
        console.log(`F8 - Code result ${promoCode} - ${playerId} - ${captchaSolution}: `, codeResult);
        if (codeResult.valid === true) {
            // Bước 4: Cộng điểm nếu code hợp lệ
            const addPointResult = await addPoints(playerId, promoCode, proxyString);
            console.log(`F8 - Add Point result ${promoCode} - ${playerId} - ${captchaSolution}:`, addPointResult);

            if (addPointResult.valid === true) {
                success.push({
                    user: playerId,
                    msg: addPointResult.point
                })
                
            } else {
                if (/tài khoản/i.test(addPointResult.text_mess)) {
                    failed.push({
                        user: playerId,
                        msg: addPointResult.text_mess
                    })
                }
            }
        } else {

        }

    } catch (error) {
        console.error('Process failed:', error.message);
    }
};


async function processF8(message, client) {

    let imgPath = await helper.downloadMedia(message, client)
    let codes = await helper.processImage(imgPath, 8);

    if (codes.length === 0) {
        console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
        return;
    }

    const f8Users = await helper.readFileToArray("config/f8.txt");
    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    const tasks = [];
    success = []; failed = [];
    for (const user of f8Users) {
        let proxyString = await helper.getRandomProxy(); // Proxy dạng user:pass@ip:port
        let code = helper.getRandomElement(codes);
        let [username, teleId] = user.split(/\s+/);
        tasks.push(limit(() => enterF8Code(code, username, proxyString)));
    }

    await Promise.all(tasks);

    let summaryMsg = "Code mới F8 đây\n";

    for (const ele of success) {
        await helper.processDoneUser("./config/f8.txt", "./output/f8-done.txt", ele.user, ele.msg, 0);
        summaryMsg += `${helper.hideLast3Chars(ele.user)} | ${ele.msg}\n`;
    }

    for (const eleFail of failed) {
        let temp = `${eleFail.user} | ${eleFail.msg}`;
        await helper.writeFailedUser("./output/f8-failed.txt", temp);
    }

    if (success.length > 0) {
        // Giả sử dùng chatId từ phần tử đầu tiên
        const chatId1 = -1002544552541;
        const chatId2 = -1002613344439
        // await helper.sendTelegramMessage(chatId1, summaryMsg.trim());
        await helper.sendTelegramMessage(chatId2, summaryMsg.trim());
    }

}


module.exports = { processF8 }