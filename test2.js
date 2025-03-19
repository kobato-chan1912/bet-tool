const axios = require('axios');
const puppeteer = require('puppeteer');


const enter8K = async (code, user) => {
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

        console.log(`✅ 8KBet Kết quả nhập mã ${code} cho ${user}: ` + response.data.message)
    } catch (error) {
        console.error('❌ 8KBet Lỗi:', error.response ? error.response.data : error.message);
    }
};


const enterJ88 = async (code, user, bank) => {
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
        BankCard: bank
    };

    try {
        const response = await axios.post(url, data, { headers });

        console.log(`✅ J88 Kết quả nhập mã ${code} cho ${user}: ` + response.data.message)
    } catch (error) {
        console.error('❌ J88 Lỗi:', error.response ? error.response.data : error.message);
    }
};


async function enterSHCode(user, codes) { // https://https://freecode-shbet.pages.dev/
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();


  for (const code of codes) {
    try {
      console.log(chalk.yellow(`➡ Nhập mã SHBet ${code} cho user ${user}`));

      await page.goto('https://freecode-shbet.pages.dev/', {
        waitUntil: 'networkidle0'
      });

      // Nhập mã vào input
      await page.type('#promo-code', code);
      await page.click('.promo-button');

      // Lấy text từ captcha
      await page.waitForSelector('#captcha-image');
      const captchaImage = await page.$eval('#captcha-image', el => el.src);
      const captchaText = await solveCaptcha(captchaImage);
      console.log(chalk.magenta(`🔠 Captcha: ${captchaText}`));

      await page.type("#captcha-input", captchaText.toUpperCase());
      await page.click('#verify-captcha')

      try {
        // Chờ tối đa 5 giây để ô input xuất hiện
        await page.waitForFunction(() => {
          const input = document.querySelector('#swal2-input');
          return input && window.getComputedStyle(input).display !== 'none';
        }, { timeout: 5000 });

        // Nếu ô input xuất hiện, nhập username
        await page.type('#swal2-input', user);
        await page.click('.swal2-confirm');
        await sleep(3000);
        let result = await getResult(page)
        console.log(`✅ SHBet Kết quả nhập mã ${code} cho ${user}: ` + result)

      } catch (error) {
        let result = await getResult(page)
        console.log(`⚠️ SHBet Kết quả nhập mã ${code} cho ${user}: ` + result)
      }



      // Chờ 3 giây
    } catch (error) {

      console.error(chalk.red(`❌ Lỗi New88:`), error);
    }
  }

  await browser.close();
}


enter8K('bb454R6t', 'tuannguyen333')