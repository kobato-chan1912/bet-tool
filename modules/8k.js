const axios = require("axios")
const helper = require("../helpers/helper.js")
const chalk = require('chalk')
const pLimit = require('p-limit');
const sleep = ms => new Promise(res => setTimeout(res, ms));

const enter8K = async (user, codes) => {

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
        for (const code of codes) {
            tasks.push(limit(() => enter8K(user, [code])));
        }
    }

    await Promise.all(tasks);

}

module.exports = { process8K }