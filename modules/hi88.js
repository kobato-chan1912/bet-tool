const axios = require('axios');
const CryptoJS = require('crypto-js');
const md5 = require('md5');
const fs = require('fs').promises;
const helper = require("../helpers/helper.js");
const chalk = require('chalk');
const pLimit = require('p-limit');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const { HttpsProxyAgent } = require('https-proxy-agent');

// Configuration
const SITE = 'hi88';
const ENDPOINT = 'https://api-code.khuyenmaihi88.net'; // Thay bằng URL API thực tế
const CSKH_URL = 'https://cskh.hi88.com'; // URL chăm sóc khách hàng
const ENCRYPTION_KEY = 'a.t.t.c.o.d.e.h.a.u-d.a.i.h.i-8.8.@.2.0.3.0';
const token = 'YOUHFam43eRcQJm1cb3oCREQTRQQ3GnNiQR1FbQxMEDNgAWdRHShZCXtEbjMqZTQXKjU0Fj8FDh1EQ1sMKF8qPkdQHRtHEWE_elRjX0YmRBIJVWBgNCQwCHs_PFInNUsTXQpEY3lHYCxtaw42DW8XPFkFCXUed0EpfnUyTGgbNXY5Yi87WTpEGQpEaBEgHRIR_RECAPTCHA_TOKEN'; // Cần lấy từ Google reCAPTCHA



let success = [];
let failed = [];



// Hàm mã hóa dữ liệu (tương tự hàm R trong file built)
function encryptData(inputJson) {
    const key = CryptoJS.MD5(ENCRYPTION_KEY).toString().toLowerCase();
    return CryptoJS.AES.encrypt(inputJson, key).toString();
}

// Hàm gửi yêu cầu lấy thông tin code
async function getCode(promoCode, proxyString) {
    try {
        const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port
        const headers = {
            'Content-Type': 'application/json',
        };

        const payload = {
            site: SITE,
            promo_code: promoCode
        };

        const encryptedKey = encryptData(JSON.stringify(payload));

        const body = {
            key: encryptedKey,
            token: token,
            deviceType: 'mobile'
        };

        const response = await axios.post(
            `${ENDPOINT}/client/get-code?site=${SITE}&promo_code=${promoCode}`,
            body,
            { headers, httpsAgent: agent }
        );

        return response.data;
    } catch (error) {
        console.error('Error in getCode:', error.message);
        throw error;
    }
}

// Hàm gửi tên tài khoản để nhận thưởng
async function addPoints(playerId, promoCode, proxyString) {
    try {
        const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port

        const headers = {
            'Content-Type': 'application/json'
        };

        const payload = {
            site: SITE,
            promo_code: promoCode,
        };

        const encryptedKey = encryptData(JSON.stringify(payload));


        const body = {
            key: encryptedKey
        };

        const response = await axios.post(
            `${ENDPOINT}/client?player_id=${playerId}&promo_code=${promoCode}&site=${SITE}`,
            body,
            { headers, httpsAgent: agent }
        );

        return response.data;
    } catch (error) {
        console.error('Error in submitPlayerId:', error.message);
        throw error;
    }
}

// Hàm chính xử lý toàn bộ quy trình
async function enterHi88Code(promoCode, playerId, proxyString, teleId) {
    try {


        // const codeResult = await getCode(promoCode, proxyString);
        // console.log(`Hi88 - Code result ${promoCode} - ${playerId}: `, codeResult);
        if (true) {
            const addPointResult = await addPoints(playerId, promoCode, proxyString);
            console.log(`Hi88 - Add Point result ${promoCode} - ${playerId}:`, addPointResult);

            if (addPointResult.valid) {
                success.push({
                    user: playerId,
                    msg: addPointResult.point,
                    tele: teleId
                })

            } else {
                if (/tài khoản/i.test(addPointResult.text_mess)) {
                    failed.push({
                        user: playerId,
                        msg: /giao dịch/i.test(addPointResult.text_mess) ? 'Đã lâu không nạp' : 'Tài khoản không đủ điều kiện',
                        tele: teleId
                    })
                }
            }

        }

    } catch (error) {
        console.error('Failed to redeem code:', error.message);
    }
}

async function processHi88(message, client) {
    let messageContent = message.message;
    let codes;
    let codesText = await helper.processText(messageContent, 8);
    let imgPath = await helper.downloadMedia(message, client)
    let codesImage = await helper.processImage(imgPath, 8);
    codes = [...codesText, ...codesImage];
    codes = codes.filter(code => !['freecode', 'hi88code', 'hi88live', 'Hi88CODE', 'QuaKhung88', 'iPhone', 'ProMax', 
        'ABCVIP', '16PROMAX', 'MINIGAME', 'ExtraBet'].includes(code));

    if (codes.length === 0) {
        console.log(chalk.red('Không có code!'));
        return;
    }


    let hi88Users = await helper.readFileToArray("config/hi88.txt");

    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    const tasks = [];
    success = []; failed = [];



    for (const user of hi88Users) {
        let proxyString = await helper.getRandomProxy(); // Proxy dạng user:pass@ip:port
        let code = helper.getRandomElement(codes);
        let [username, teleId] = user.split(/\s+/);
        tasks.push(limit(() => enterHi88Code(code, username, proxyString, teleId)));
    }

    await Promise.all(tasks);

    let summaryMsg = "Code mới Hi88 đây\n";


    for (const ele of success) {
        await helper.processDoneUser("./config/hi88.txt", "./output/hi88-done.txt", ele.user, ele.msg, 0);
        summaryMsg += `${ele.user} | ${ele.msg}\n`;
    }

    let failedMsg = "Danh sách acc hi88 lạm dụng\n";

    for (const eleFail of failed) {
        let temp = `${eleFail.user} | ${eleFail.msg}`;
        failedMsg += `${temp}\n`;
        await helper.processFailUser("./config/hi88.txt", "./config/hi88-failed.txt", eleFail.user, eleFail.tele);
    }

    const chatId1 = -1002503689777

    const chatId2 = -1002630085987


    if (failed.length > 0) {
        await helper.sendTelegramMessage(chatId2, failedMsg.trim());
    }

    if (success.length > 0) {
        await helper.sendTelegramMessage(chatId1, summaryMsg.trim());
    }


}


module.exports = {
    processHi88
};