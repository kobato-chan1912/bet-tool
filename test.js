const axios = require('axios');
const helper = require("./helpers/helper.js")
const https = require('https');
const {HttpsProxyAgent} = require('https-proxy-agent');





const enterJ88 = async (user, code, bank, status) => {
    let proxyString = await helper.getRandomProxy()
    const agent = new HttpsProxyAgent(`https://${proxyString}`);
    console.log(agent)
    
    const url = 'https://httpbin.org/ip';

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
        BankCard: bank
    };



    try {
        const response = await axios.post(url, { 
            headers, 
            proxy: false,
            httpsAgent: agent
        });

        console.log(response)
        

        const messageRsp = response.data.message;
        console.log(`✅ J88 Kết quả nhập mã ${code} cho ${user}: ` + messageRsp)
        if (helper.isNaturalNumber(messageRsp) || messageRsp.includes("Đã tham gia")) {
            await helper.processDoneUser("./config/j88.txt", "./output/j88-done.txt", user, messageRsp, status);
        }

    } catch (error) {
        console.log(error)
        console.error('❌ J88 Lỗi:', error.response ? error.response.data : error.message);
    }
};

const fetchIP = async () => {
    try {
        const response = await axios.get('http://httpbin.org/ip', { proxy });
        console.log(response.data);
    } catch (error) {
        console.error('Lỗi:', error.message);
    }
};

enterJ88('xxx', 'xxx', 1234, 0)
