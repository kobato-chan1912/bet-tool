const cheerio = require('cheerio');
const axios = require("axios")
const helper = require('./helpers/helper.js');

async function main() {

    const { data } = await axios.get('https://33winbonus.com', {
        headers: {
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'vi,en-US;q=0.9,en;q=0.8,fr-FR;q=0.7,fr;q=0.6,ja;q=0.5,pt;q=0.4,da;q=0.3,it;q=0.2,tr;q=0.1,ko;q=0.1,zh-CN;q=0.1,zh;q=0.1',
            'content-type': 'application/json',
            'origin': 'https://33winbonus.com',
            'cookie': 'PHPSESSID=sjkr8n9qrb06h2d7cetpcqm750',
            'priority': 'u=1, i',
            'referer': 'https://33winbonus.com/',
            'sec-ch-ua': '"Chromium";v="135", "Not:A-Brand";v="24", "Google Chrome";v="135"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/135.0.7049.53 Mobile/15E148 Safari/604.1'

        }
    });

    const $ = cheerio.load(data);

    // Tìm thẻ img chứa captcha
    const captchaImg = $('label[for="captcha"]')
        .next('div')
        .find('img')
        .attr('src');
    console.log(captchaImg)
    // Kiểm tra và in ra dữ liệu base64
    if (captchaImg && captchaImg.startsWith('data:image')) {
        const base64Data = captchaImg.split(',')[1]; // Bỏ phần "data:image/png;base64,"
        const captchaSolution = await helper.solveCaptcha(base64Data);
        console.log(captchaSolution)
    } else {
        console.error('Không tìm thấy captcha base64!');
    }

}

main()