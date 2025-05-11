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
    site: "mb66",
    endpoint: "https://api-freecode-mb66.freecodevip.org",
    key_free: "mocbai.haudai@att$$2023@@mb66",
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



// ✅ Xác thực code (dùng HttpsProxyAgent)
const getCode = async (promoCode, proxyString) => {
    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port
    const headers = {
        'Content-Type': 'application/json'
    };

    const objParam = { promo_code: promoCode };
    const encryptedKey = encrypt(JSON.stringify(objParam));
    console.log('encryptedKey: ', encryptedKey);
    const body = {
        key: encryptedKey,
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
const enterMb66 = async (promoCode, playerId, proxyString) => {
    try {
        console.log('start')
        const codeResult = await getCode(promoCode, proxyString);
        console.log(`Code result ${promoCode} - ${playerId}: `, codeResult);

        if (codeResult.valid) {
            const addPointResult = await addPoints(playerId, promoCode, proxyString);
            console.log(`Add Point result ${promoCode} - ${playerId}:`, addPointResult);


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
        } else {
            // console.log('New88 - Lỗi API Code Result: ', codeResult);
        }
    } catch (error) {
        console.error('Process failed: ', error.message);
    }
};


enterMb66("g83kfd", "longnguyen", "Kuden1808:8120B65A76C449327404ECEFF67A734F@102.223.184.22:44877");