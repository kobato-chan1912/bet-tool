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

        const addPointResult = await addPoints(playerId, promoCode, proxyString);
        console.log(`New88 - Add Point result ${promoCode} - ${playerId}:`, addPointResult);


        if (addPointResult.valid) {
            success.push({
                user: playerId,
                msg: addPointResult.point
            })
            // await helper.processDoneUser("./config/new88.txt", "./output/new88-done.txt", playerId, addPointResult.point, 0);
        } else {
            if (/tài khoản/i.test(addPointResult.text_mess)) {
                failed.push({
                    user: playerId,
                    msg: addPointResult.text_mess
                })
            }
        }
    } catch (error) {
        console.error('Process failed: ', error.message);
    }
};

// 🔥 Xử lý message (dùng HttpsProxyAgent)
async function processNew88(message) {
    let messageContent = message.message;
    let codes = await helper.processText(messageContent, 8);
    if (codes.length === 0) {

        codes = await helper.processText(messageContent, 10);

        if (codes.length === 0) {
            console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
            return;
        }


    }

    let new88Users = await helper.readFileToArray("config/new88.txt");
    const { firstHalf, secondHalf } = helper.splitArrayInHalf(new88Users);

    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    const tasks = [];
    success = []; failed = [];


    let fromGroupId = message.peerId.channelId.toString();

    if (fromGroupId == "2332416396") {
        new88Users = firstHalf;
    }

    if (fromGroupId == "2254564969") {
        new88Users = secondHalf;
    }

    for (const user of new88Users) {
        let proxyString = await helper.getRandomProxy(); // Proxy dạng user:pass@ip:port
        let code = helper.getRandomElement(codes);
        let [username, teleId] = user.split(/\s+/);
        tasks.push(limit(() => enterNew88Code(code, username, proxyString)));
    }

    await Promise.all(tasks);

    let summaryMsg = "Code mới New88 đây\n";


    for (const ele of success) {
        await helper.processDoneUser("./config/new88.txt", "./output/new88-done.txt", ele.user, ele.msg, 0);
        summaryMsg += `${ele.user} | ${ele.msg}\n`;
    }

    for (const eleFail of failed) {
        let temp = `${eleFail.user} | ${eleFail.msg}`;
        await helper.writeFailedUser("./output/new88-failed.txt", temp);
    }

    if (success.length > 0) {
        // Giả sử dùng chatId từ phần tử đầu tiên
        const chatId1 = -1002544552541;
        const chatId2 = -1002613344439
        await helper.sendTelegramMessage(chatId1, summaryMsg.trim());
        await helper.sendTelegramMessage(chatId2, summaryMsg.trim());
    }

}

module.exports = { processNew88 };