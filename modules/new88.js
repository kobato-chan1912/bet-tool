const axios = require('axios');
const CryptoJS = require('crypto-js');
const md5 = require('md5');
const fs = require('fs').promises;
const helper = require("../helpers/helper.js");
const chalk = require('chalk');
const pLimit = require('p-limit');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const { HttpsProxyAgent } = require('https-proxy-agent');

// Thông tin cấu hình
const information = {
    site: "new88",
    endpoint: "https://api-code.khuyenmainew88.net",
    key_free: "att.code.free-code.new-88@2030$",
};

// Hàm mã hóa
const encrypt = (text) => {
    const md5Key = md5(information.key_free).toLowerCase();
    return CryptoJS.AES.encrypt(text, md5Key).toString();
};

// Giải mã (nếu cần)
const decrypt = (cipherText) => {
    const md5Key = md5(information.key_free).toLowerCase();
    const bytes = CryptoJS.AES.decrypt(cipherText, md5Key);
    return bytes.toString(CryptoJS.enc.Utf8);
};

// 🧩 Giải Captcha (dùng HttpsProxyAgent)
async function solveCaptcha(imageBase64) {
    let readConfig = await loadConfig();
    let apiKey = readConfig.CAPTCHA_KEY;

    try {
        const response = await axios.post('https://autocaptcha.pro/apiv3/process', {
            key: apiKey,
            type: 'imagetotext',
            img: imageBase64
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        let data = response.data;
        if (!data.captcha) throw new Error(`❌ Lỗi lấy kết quả captcha`);
        return data.captcha;
    } catch (error) {
        console.error('Lỗi giải Captcha:', error.response?.data || error.message);
        return null;
    }
}

// 🗂 Load cấu hình
async function loadConfig() {
    try {
        const data = await fs.readFile("config/config.ini", 'utf8');
        const config = {};
        data.split('\n').forEach((line) => {
            const [key, value] = line.split('=');
            if (key && value) {
                config[key.trim()] = value.trim();
            }
        });
        return config;
    } catch (err) {
        return {};
    }
}

// 🏆 Lấy token captcha (dùng HttpsProxyAgent)
const getCaptchaToken = async (proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port
    try {
        const response = await axios.get(
            `${information.endpoint}/api/get-verification-code?site=${information.site}`,
            {
                headers: { 'Content-Type': 'application/json' },
                httpsAgent: agent
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error getting captcha token:', error.message);
        throw error;
    }
};

// ✅ Xác thực code (dùng HttpsProxyAgent)
const getCode = async (promoCode, captchaInput, clientToken, proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': clientToken
    };

    const objParam = { promo_code: promoCode };
    const encryptedKey = encrypt(JSON.stringify(objParam));
    const body = {
        key: encryptedKey,
        captchaCode: captchaInput,
        token: clientToken,
        deviceType: 'mobile'
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

// ⭐ Cộng điểm (dùng HttpsProxyAgent)
const addPoints = async (playerId, promoCode, proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port
    const headers = { 'Content-Type': 'application/json' };
    const objParam = { promo_code: promoCode };
    const encryptedKey = encrypt(JSON.stringify(objParam));
    const body = { key: encryptedKey };

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

// 🔄 Hàm chính (dùng HttpsProxyAgent)
const enterNew88Code = async (promoCode, playerId, proxyString) => {
    try {
        console.log('Getting captcha token...');
        const captchaData = await getCaptchaToken(proxyString);
        const captchaBase64 = captchaData.captchaUrl;
        const clientToken = captchaData.token;

        console.log('Solving captcha...');
        let captchaSolution = await solveCaptcha(captchaBase64, proxyString);
        console.log(captchaSolution);
        captchaSolution = captchaSolution.toUpperCase();

        console.log('Checking promo code:', promoCode);
        const codeResult = await getCode(promoCode, captchaSolution, clientToken, proxyString);

        if (codeResult.valid) {
            console.log('Adding points for player:', playerId);
            const addPointResult = await addPoints(playerId, promoCode, proxyString);
            console.log('Add points result:', addPointResult);

            if (addPointResult.valid) {
                await helper.processDoneUser("./config/new88.txt", "./output/new88-done.txt", playerId, addPointResult.point, 0);
                console.log(`New88 -  ${addPointResult.point} cho ${addPointResult.player_id}`);
            } else {
                console.log('New88 - Không thể thêm điểm:', addPointResult.text_mess);
            }
        } else {
            console.log('New88 - Lỗi API Code Result: ', codeResult.text_mess);
        }
    } catch (error) {
        console.error('Lỗi: ', error.message);
    }
};

// 🔥 Xử lý message (dùng HttpsProxyAgent)
async function processNew88(message) {
    let messageContent = message.message;
    let codes = await helper.processText(messageContent, 12);
    if (codes.length === 0) {

        codes = await helper.processText(messageContent, 10);

        if (codes.length === 0) {
            console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
            return;
        }


    }
    const new88Users = await helper.readFileToArray("config/new88.txt");
    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    const tasks = [];
    for (const user of new88Users) {
        let proxyString = await helper.getRandomProxy(); // Proxy dạng user:pass@ip:port
        let code = helper.getRandomElement(codes);
        tasks.push(limit(() => enterNew88Code(code, user, proxyString)));
    }

    await Promise.all(tasks);
}

module.exports = { processNew88 };