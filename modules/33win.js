const cheerio = require('cheerio');
const axios = require("axios")
const helper = require("../helpers/helper.js");

let success = [];
const { HttpsProxyAgent } = require('https-proxy-agent');
const pLimit = require('p-limit');
const chalk = require('chalk');
const qs = require('qs');


async function getCaptchaToken(proxyString) {


    const agent = new HttpsProxyAgent(`http://${proxyString}`);
    const { data } = await axios.get('https://33winbonus.com', {
        headers: {
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
            'content-type': 'application/json',
            'origin': 'https://33winbonus.com/',
            'priority': 'u=1, i',
            'cookie': 'PHPSESSID=sjkr8n9qrb06h2d7cetpcqm750',
            'referer': 'https://33winbonus.com/',
            'sec-ch-ua': '"Chromium";v="135", "Not:A-Brand";v="24", "Google Chrome";v="135"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/135.0.7049.53 Mobile/15E148 Safari/604.1'

        }, httpsAgent: agent
    });

    const $ = cheerio.load(data);

    // Tìm thẻ img chứa captcha
    const captchaImg = $('label[for="captcha"]')
        .next('div')
        .find('img')
        .attr('src');
    // Kiểm tra và in ra dữ liệu base64
    if (captchaImg && captchaImg.startsWith('data:image')) {
        const base64Data = captchaImg.split(',')[1]; // Bỏ phần "data:image/png;base64,"
        const captchaSolution = await helper.solveCaptchaWithAntiCaptcha(base64Data, false);
        return captchaSolution.toUpperCase();
    } else {
        console.error('Không tìm thấy captcha base64!');
    }

}

async function enter33win(promoCode, account, proxyString) {
    const agent = new HttpsProxyAgent(`http://${proxyString}`);
    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://33winbonus.com/',
        'priority': 'u=1, i',
        'referer': 'https://33winbonus.com/',
        'sec-ch-ua': '"Chromium";v="135", "Not:A-Brand";v="24", "Google Chrome";v="135"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'cookie': 'PHPSESSID=sjkr8n9qrb06h2d7cetpcqm750',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/135.0.7049.53 Mobile/15E148 Safari/604.1'

    };

    let captchaSolution = await getCaptchaToken(proxyString);
    console.log(captchaSolution)

    const body = qs.stringify({
        action: 'check_captcha',
        captcha: captchaSolution,
        promoInfo: promoCode,
        account: account
    });

    const response = await axios.post(
        `https://33winbonus.com/wp-admin/admin-ajax.php`,
        body,
        { headers, httpsAgent: agent }
    );


    let rspData = response.data;
    console.log(rspData);
    if (helper.hasNumber(rspData.data.message)) {
        success.push({
            user: account,
            msg: rspData.data.message
        });
        console.log(`✅ 33Win ${account} - ${promoCode} - ${rspData.data.message}`);
    } else {
        console.log(`❌ 33Win ${account} - ${promoCode} - ${rspData.data.message}`);
    }

}


async function processwin33(message, client) {
    console.log(chalk.greenBright(`\n📥 Code mới từ 33WIN`));
    const imgPath = await helper.downloadSecondPhotoInAlbum(message, client);
    let codes = await helper.processImage(imgPath, 5);

    if (codes.length === 0) {
        console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
        return;
    }


    const win33Users = await helper.readFileToArray("config/33win.txt");
    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    const tasks = [];
    success = [];
    for (const user of win33Users) {
        let proxyString = await helper.getRandomProxy(); // Proxy dạng user:pass@ip:port
        let code = helper.getRandomElement(codes);
        let [username, teleId] = user.split(/\s+/);
        tasks.push(limit(() => enter33win(code, username, proxyString)));
    }

    await Promise.all(tasks);

    let summaryMsg = "Code mới 33WIN đây\n";
    // 
    for (const ele of success) {
        await helper.processDoneUser("./config/33win.txt", "./output/33win-done.txt", ele.user, ele.msg, 0);
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
    processwin33
};