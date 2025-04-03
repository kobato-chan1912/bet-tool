const axios = require("axios")
const helper = require("../helpers/helper.js")
const chalk = require('chalk')
const pLimit = require('p-limit');
const sleep = ms => new Promise(res => setTimeout(res, ms));

const enterJ88 = async (user, code, bank, status) => {

    let TurnstileToken = await helper.solveTurnstile("0x4AAAAAABDOJN8QNe5PfVyR", "https://j88code.com")

    const url = 'https://api.j88code.com/Promotion/CheckInviteCode';

    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
        'content-type': 'application/json',
        'origin': 'https://j88code.com',
        'priority': 'u=1, i',
        'referer': 'https://j88code.com/',
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
        InvitationCode: code,
        BankCard: bank,
        TurnstileToken: TurnstileToken
    };

    try {
        const response = await axios.post(url, data, { headers });
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
    // let url = `https://t.me/testcode12321/${msgId}?embed=1`

    let messageContent = await helper.fetchSpoilerText(url);

    let codes = await helper.processText(messageContent, 6);
    if (codes.length === 0) {
        let attempts = 0;
        const maxAttempts = 14;
        const interval = 5000; // 5 giây = 5000 mili giây
    
        while (attempts < maxAttempts && codes.length === 0) {
            await sleep(interval);
            messageContent = await helper.fetchSpoilerText(url);
            codes = await helper.processText(messageContent, 6);
            if (codes.length === 0)
            {

                let imagePath = await helper.fetchImage(url)
                if (imagePath !== null){

                    codes = await helper.processImage(imagePath, 6)

                }

            }




            attempts++;
            
            if (codes.length === 0 && attempts === maxAttempts) {
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
        if (typeof (status) == "undefined") { status = 0 }
        let code = helper.getRandomElement(codes);
        tasks.push(limit(() => enterJ88(username, code, userNumber, status)));
        // for (const code of codes) {
        //     tasks.push(limit(() => enterJ88(username, code, userNumber, status)));
        // }
    }

    await Promise.all(tasks);


}

module.exports = { processJ88 }