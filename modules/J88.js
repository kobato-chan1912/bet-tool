const axios = require("axios")
const helper = require("../helpers/helper.js")
const chalk = require('chalk')
const pLimit = require('p-limit');
const sleep = ms => new Promise(res => setTimeout(res, ms));

let success = [];
let deleteAccs = [];


const API_URL = 'https://api.adavawef.top';
const DISTINCT_ID = '019658ce-75cb-7e8d-a27c-65888e879f2f';

const headers = {
    'accept': '*/*',
    'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
    'content-type': 'application/json',
    'origin': 'https://j88code.com',
    'priority': 'u=1, i',
    'referer': 'https://j88code.com/',
    'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
};

async function checkVerifyCode(verifyCode) {
    try {
        const response = await axios.post(
            `${API_URL}/Promotion/CheckVerifyCode`,
            {
                VerifyCode: verifyCode,
                DistinctId: DISTINCT_ID
            },
            { headers }
        );

        if (response.data.code === 200) {
            return response.data.data; // Returns the token
        } else {
            throw new Error(response.data.message || 'Verification failed');
        }
    } catch (error) {
        console.error('Error in checkVerifyCode:', error.message);
        throw error;
    }
}


async function getInviteBonus(inviteCode, account, bankCard, verifyCode, token) {
    try {
        const response = await axios.post(
            `${API_URL}/Promotion/GetInviteBonus`,
            {
                InviteCode: inviteCode,
                Account: account,
                BankCard: bankCard,
                VerifyCode: verifyCode,
                Token: token,
                DistinctId: DISTINCT_ID
            },
            { headers }
        );

        return response.data;
    } catch (error) {
        console.error('Error in getInviteBonus:', error.message);
        throw error;
    }
}

const enterJ88 = async (user, code, bank, status, chatId) => {

    try {
        let verifyCode = await helper.solveJ88Captcha("MTPublic-rNhjhnaV7", "https://j88code.com")
        const token = await checkVerifyCode(verifyCode);
        const responseData = await getInviteBonus(code, user, bank, verifyCode, token);
        const messageRsp = responseData.message;
        console.log(`✅ J88 Kết quả nhập mã ${code} cho ${user}: ` + messageRsp)
        if (helper.isNaturalNumber(messageRsp) ||
            messageRsp.includes("tham gia") ||
            messageRsp.includes("không tồn tại") ||
            messageRsp.includes("không đủ điều kiện") ||
            messageRsp.includes("ngân hàng")

        ) {
            success.push({
                user: user,
                msg: helper.isNaturalNumber(messageRsp) ? messageRsp : "lạm dụng",
                chatId: chatId
            })
        }




    } catch (error) {
        console.error('❌ J88 Lỗi:', error.response ? error.response.data : error.message);
    }
};


async function processJ88(message) {

    success = [];
    deleteAccs = [];
    console.log(chalk.greenBright(`\n📥 Code mới từ J88`));

    let msgId = message.id
    console.log(msgId)
    // let url = `https://t.me/J88COM_NOHU_BANCA/${msgId}?embed=1`
    let url = `https://t.me/testcode12321/${msgId}?embed=1`

    let messageContent = await helper.fetchSpoilerText(url);

    let codes = await helper.processText(messageContent, 6);
    if (codes.length < 5) {
        let attempts = 0;
        const maxAttempts = 30;
        const interval = 100; // 5 giây = 5000 mili giây

        while (attempts < maxAttempts && codes.length < 5) {

            try {
                await sleep(interval);
                messageContent = await helper.fetchSpoilerText(url);
                codes = await helper.processText(messageContent, 6);
                if (codes.length < 5) {

                    let imagePath = await helper.fetchImage(url)
                    if (imagePath !== null) {

                        codes = await helper.processImage(imagePath, 6)

                    }

                }
            } catch (error) {

            }






            attempts++;

            if (codes.length < 5 && attempts === maxAttempts) {
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
        let [username, userNumber, chatId] = user.split(/\s+/);
        let code = helper.getRandomElement(codes);
        tasks.push(limit(() => enterJ88(username, code, userNumber, 0, chatId)));
        // for (const code of codes) {
        //     tasks.push(limit(() => enterJ88(username, code, userNumber, status)));
        // }
    }

    await Promise.all(tasks);
    let summaryMsg = "Code mới J88 đây\n";

    for (const ele of success) {
        await helper.processDoneUser("./config/j88.txt", "./output/j88-done.txt", ele.user, ele.msg, 0);
        summaryMsg += `${ele.user} | ${ele.msg}\n`;

    }


    if (success.length > 0) {
        // Giả sử dùng chatId từ phần tử đầu tiên
        const chatId1 = -1002544552541;
        const chatId2 = -1002613344439
        await helper.sendTelegramMessage(chatId1, summaryMsg.trim());
        await helper.sendTelegramMessage(chatId2, summaryMsg.trim());
    }


}

module.exports = { processJ88 }