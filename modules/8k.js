const axios = require("axios")
const helper = require("../helpers/helper.js")
const chalk = require('chalk')
const pLimit = require('p-limit');
const sleep = ms => new Promise(res => setTimeout(res, ms));
let success = [];
let deleteAccs = [];


const enter8K = async (user, codes, chatId) => {

    let code = codes[0]


    const url = 'https://cjw242c.kmncksje.top/Promotion/CheckCode';

    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
        'content-type': 'application/json',
        'origin': 'https://code88k.vip',
        'priority': 'u=1, i',
        'referer': 'https://code88k.vip/',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
    };

    const data = {
        Account: user,
        InvitationCode: code
    };

    try {
        const response = await axios.post(url, data, { headers });
        const messageRsp = response.data.message;
        console.log(`✅ 8KBET Kết quả nhập mã ${code} cho ${user}: ` + messageRsp)
        if (helper.isNaturalNumber(messageRsp)) {

            success.push({
                user: user,
                msg: messageRsp,
                chatId: chatId
            })

            // await helper.processDoneUser("./config/8k.txt", "./output/8kbet-done.txt", user, messageRsp, 0);
        }

        if (messageRsp.includes("Đã tham gia") || messageRsp.includes("đủ điều kiện")) {

            deleteAccs.push({
                user: user,
                msg: messageRsp,
                chatId: chatId
            })

        }

    } catch (error) {
        console.error('❌ 8KBet Lỗi:', error.response ? error.response.data : error.message);
    }
};

async function process8K(message, client) {
    console.log(chalk.greenBright(`\n📥 Code mới từ 8K`));
    console.log(chalk.white(`\n${message.message}`));
    let messageContent = message.message;
    let codes
    if (messageContent.includes("ở bên dưới")) {
        codes = await helper.processText(messageContent, 8);
    } else {
        let imgPath = await helper.downloadMedia(message, client)
        codes = await helper.processImage(imgPath, 8);
    }


    if (codes.length === 0) {
        console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
        return;
    }


    const Eight88Users = await helper.readFileToArray("config/8k.txt")


    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    // await sleep(parseInt(config.SLEEP_BEFORE))
    const tasks = [];
    success = [];
    deleteAccs = [];
    for (const user of Eight88Users) {
        let [username, chatId] = user.split(/\s+/);
        for (const code of codes) {
            tasks.push(limit(() => enter8K(username, [code], chatId)));
        }
    }

    await Promise.all(tasks);
    let summaryMsg = "Code mới J88 đây\n";
    for (const ele of success) {
        await helper.processDoneUser("./config/8k.txt", "./output/8kbet-done.txt", ele.user, ele.msg, 0);
        summaryMsg += `${ele.user} | ${ele.msg}\n`;
        // await helper.sendTelegramMessage(ele.chatId, msg)
    }
    if (success.length > 0) {
        // Giả sử dùng chatId từ phần tử đầu tiên
        const chatId1 = -1002544552541;
        const chatId2 = -1002613344439
        await helper.sendTelegramMessage(chatId1, summaryMsg.trim());
        await helper.sendTelegramMessage(chatId2, summaryMsg.trim());
    }


    for (const dlAcc of deleteAccs) {
        await helper.deleteAccs("./config/8k.txt", dlAcc.user)
        let msg = `${dlAcc.user} | ${dlAcc.msg}`
        await helper.sendTelegramMessage(dlAcc.chatId, msg)
    }

}

module.exports = { process8K }