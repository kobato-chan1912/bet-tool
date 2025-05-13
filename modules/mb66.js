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


const FM = "https://api-freecode-mb66.freecodevip.org"; // API base URL
const IM = "mb66"; // site
const UM = "mocbai.haudai@att$$2023@@mb66"; // Secret key for AES


// Hàm mã hóa
function Mb(inputJson) {
    const key = CryptoJS.MD5(UM).toString().toLowerCase();
    return CryptoJS.AES.encrypt(inputJson, key).toString();
}

// Giải mã (nếu cần)
function Yz(raw) {
    return CryptoJS.SHA256(raw).toString();
}

// --- Hàm sinh captcha (client-side)
function generateCaptcha(length = 5) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}


// ✅ Xác thực code (dùng HttpsProxyAgent)
const getCode = async (promo_code, proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port
    const headers = {
        'Content-Type': 'application/json'
    };



    const payload = {
        promo_code
    };
    const key = Mb(JSON.stringify(payload));

    // console.log('encryptedKey: ', encryptedKey);
    const body = {
        key: key,
        deviceType: 'mobile'
    };

    try {
        const response = await axios.post(
            `${FM}/client/get-code?promo_code=${promo_code}&site=${IM}`,
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
const addPoints = async (playerId, promo_code, captchaToken, proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port
    const headers = { 'Content-Type': 'application/json' };
    const key = Mb(JSON.stringify({ promo_code }));
    const keyCode = Yz(playerId + IM + promo_code);
    const body = {
        key,
        keyCode,
        captchaTokenGG: captchaToken

    }

    try {
        const response = await axios.post(
            `${FM}/client?player_id=${playerId}&promo_code=${promo_code}&site=${IM}`,
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
const enterMb66 = async (promoCode, playerId, proxyString, teleId) => {
    try {
        const codeResult = await getCode(promoCode, proxyString);
        console.log(`Code result ${promoCode} - ${playerId}: `, codeResult);

        if (codeResult.valid) {
            const CaptchaToken = generateCaptcha();
            const addPointResult = await addPoints(playerId, promoCode, CaptchaToken, proxyString);
            console.log(`Add Point result ${promoCode} - ${playerId}:`, addPointResult);


            if (addPointResult.valid) {
                success.push({
                    user: playerId,
                    msg: addPointResult.point,
                    tele: teleId
                })
                // await helper.processDoneUser("./config/new88.txt", "./output/new88-done.txt", playerId, addPointResult.point, 0);
            } else {
                if (/tài khoản/i.test(addPointResult.text_mess)) {
                    failed.push({
                        user: playerId,
                        msg: /giao dịch/i.test(addPointResult.text_mess) ? 'Đã lâu không nạp' : 'Tài khoản không đủ điều kiện',
                        tele: teleId
                    })
                }
            }
        } else {
            // console.log('New88 - Lỗi API Code Result: ', codeResult);
        }
    } catch (error) {
        console.error('Process failed: ', error.message);
    }
};




async function processMB66(message) {
    console.log(chalk.greenBright(`\n📥 Code mới từ MB66`));
    let messageContent = message.message;
    let codes;
    const codes6 = await helper.processText(messageContent, 6);
    const codes8 = await helper.processText(messageContent, 8);
    const codes10 = await helper.processText(messageContent, 10);
    codes = [...codes6, ...codes8, ...codes10];

    // remove ['Iphone', 'Promax', 'dancer', 'online'] 
    codes = codes.filter(code => !['Iphone', 'Promax', 'dancer', 'online', 'LIVESTREAM'].includes(code));

    if (codes.length === 0) {
        console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
        return;
    }


    const mb66Users = await helper.readFileToArray("config/mb66.txt");
    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    const tasks = [];
    success = []; failed = [];
    for (const user of mb66Users) {
        let proxyString = await helper.getRandomProxy(); // Proxy dạng user:pass@ip:port
        let code = helper.getRandomElement(codes);
        let [username, teleId] = user.split(/\s+/);
        tasks.push(limit(() => enterMb66(code, username, proxyString, teleId)));
    }

    await Promise.all(tasks);

    let summaryMsg = "Code mới MB66 đây\n";
    // 
    for (const ele of success) {
        await helper.processDoneUser("./config/mb66.txt", "./output/mb66-done.txt", ele.user, ele.msg, 0);
        summaryMsg += `${helper.hideLast3Chars(ele.user)} | ${ele.msg}\n`;
    }

    let failedMsg = "Danh sách acc mb66 lạm dụng\n";

    for (const eleFail of failed) {
        let temp = `${eleFail.user} | ${eleFail.msg}`;
        failedMsg += `${temp}\n`;
        await helper.processFailUser("./config/mb66.txt", "./config/mb66-failed.txt", eleFail.user, eleFail.tele);
    }

    

    // 
    const chatId2 = -1002613344439


    if (failed.length > 0) {
        await helper.sendTelegramMessage(chatId2, failedMsg.trim());
    }

    if (success.length > 0) {
        await helper.sendTelegramMessage(chatId2, summaryMsg.trim());
    }

}


// enterMb66('0ozcEu', 'thunga2222', 'DD3E0F:P2c06pmD@echo.tunproxy.net:35903')

module.exports = {
    processMB66
};