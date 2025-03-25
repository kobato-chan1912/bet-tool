const axios = require("axios")
const helper = require("../helpers/helper.js")
const chalk = require('chalk')
const pLimit = require('p-limit');
const sleep = ms => new Promise(res => setTimeout(res, ms));

const enter8K = async (user, code, proxyString) => {

    const agent = new HttpsProxyAgent(`http://${proxyString}`);

    const url = 'https://cjw242c.kmncksje.top/Promotion/CheckCode';

    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
    };

    const data = {
        Account: user,
        InvitationCode: code
    };

    try {
        const response = await axios.post(url, data, { headers, httpsAgent: agent });
        const messageRsp = response.data.message;
        console.log(`✅ 8KBET Kết quả nhập mã ${code} cho ${user}: ` + messageRsp)
        if (helper.isNaturalNumber(messageRsp) || messageRsp.includes("Đã tham gia")) {
            await helper.processDoneUser("./config/8k.txt", "./output/8kbet-done.txt", user, messageRsp, 0);
        }
    } catch (error) {
        console.error('❌ 8KBet Lỗi:', error.response ? error.response.data : error.message);
    }
};

async function process8K(message) {
    console.log(chalk.greenBright(`\n📥 Code mới từ 8K`));
    console.log(chalk.white(`\n${message.message}`));
    let messageContent = message.message;


    const codes = await helper.processText(messageContent, 8);
    if (codes.length === 0) {
        console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
        return;
    }


    const Eight88Users = await helper.readFileToArray("config/8k.txt")


    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    // await sleep(parseInt(config.SLEEP_BEFORE))
    const tasks = [];
    for (const user of Eight88Users) {
        let proxy = await helper.getRandomProxy()
        for (const code of codes) {
            tasks.push(limit(() => enter8K(user, code, proxy)));
        }
    }

    await Promise.all(tasks);

}

module.exports = { process8K }