const axios = require("axios")
const helper = require("../helpers/helper.js")
const chalk = require('chalk')
const pLimit = require('p-limit');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const { HttpsProxyAgent } = require('https-proxy-agent');

const enterJ88 = async (user, code, bank, status, proxyString) => {

    const agent = new HttpsProxyAgent(`http://${proxyString}`); // Proxy dạng user:pass@ip:port
    const url = 'https://api.j88code.com/Promotion/CheckInviteCode';

    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
    };

    const data = {
        Account: user,
        InvitationCode: code,
        BankCard: bank
    };

    try {
        const response = await axios.post(url, data, { headers, httpsAgent: agent });

        const messageRsp = response.data.message;
        console.log(`✅ J88 Kết quả nhập mã ${code} cho ${user}: ` + messageRsp)
        if (helper.isNaturalNumber(messageRsp) || messageRsp.includes("Đã tham gia")) {
            await helper.processDoneUser("./config/j88.txt", "./output/j88-done.txt", user, messageRsp, status);
        }

    } catch (error) {
        console.error('❌ J88 Lỗi:', error.response ? error.response.data : error.message);
    }
};


async function processJ88(message) {

    console.log(chalk.greenBright(`\n📥 Code mới từ J88`));

    let msgId = message.id
    console.log(msgId)
    let url = `https://t.me/J88COM_NOHU_BANCA/${msgId}?embed=1`

    await sleep(30000)
    let messageContent = await helper.fetchSpoilerText(url);


    let codes = await helper.processText(messageContent, 6);
    if (codes.length === 0) {
        await sleep(30000)
        messageContent = await helper.fetchSpoilerText(url);
        codes = await helper.processText(messageContent, 6);

        if (codes.length === 0) {
            {
                console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
                return;
            }
        }


    }


    const J88Users = await helper.readFileToArray("config/j88.txt")

    const config = await helper.loadConfig();
    let limit = pLimit(parseInt(config.NO_BROWSER_THREADS));

    const tasks = [];
    // await sleep(parseInt(config.SLEEP_BEFORE))
    for (const user of J88Users) {
        let [username, userNumber, status] = user.split(/\s+/);
        let proxy = await helper.getRandomProxy()
        if (typeof (status) == "undefined") { status = 0 }
        for (const code of codes) {
            tasks.push(limit(() => enterJ88(username, code, userNumber, status, proxy)));
        }
    }

    await Promise.all(tasks);


}

module.exports = { processJ88 }