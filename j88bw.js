const fs = require('fs');
const puppeteer = require('puppeteer');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const helper = require("./helpers/helper.js");

(async () => {
    // Đọc danh sách tài khoản từ file
    const lines = fs.readFileSync('config/j88.txt', 'utf8').trim().split('\n');
    const accounts = lines.map(line => {
        const [username, digits] = line.trim().split(/\s+/);
        return { username, digits: digits.split('') };
    });

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://j88code.art/', { waitUntil: 'networkidle0' });

    // Nhập mã code đầu tiên
    try {
        await page.type('form input', 'sDLgFO', { delay: 100 });
        await sleep(2000);
        await page.click('form button[type=submit]');
        await sleep(5000);

        // Truy cập vào iframe mtcaptcha
        const frameHandle = await page.$('iframe#mtcaptcha-iframe-1');
        const frame = await frameHandle.contentFrame();

        const bgImageStyle = await frame.$eval('#mtcap-image-1', el => el.style.backgroundImage);
        const base64Match = bgImageStyle.match(/url\("data:image\/png;base64,(.*?)"\)/);
        const base64Image = base64Match ? base64Match[1] : null;

        const captchaResult = await helper.solveCaptchaWithAntiCaptcha(base64Image, false);
        await frame.type('#mtcap-tr-1 input', captchaResult, { delay: 100 });

        await sleep(5000);
        await page.click('#root > div > div.fixed.inset-0.z-40.flex.items-center.justify-center.bg-black.bg-opacity-50 > div > form > button');
        await sleep(5000);
    } catch (err) {
        console.error("Lỗi khi nhập code hoặc captcha:", err.message);
        await browser.close();
        return;
    }

    // Lặp từng tài khoản
    const successfulAccounts = new Set();

    for (let round = 1; round <= 5; round++) {
        console.log(`🔁 Vòng lớn thứ ${round}`);

        for (const account of accounts) {
            if (successfulAccounts.has(account.username)) {
                continue; // Bỏ qua nếu đã thành công trước đó
            }

            try {
                console.log(`🧪 Đang thử tài khoản ${account.username} - Vòng ${round}`);

                // Điền username
                await page.type('form input[placeholder*="Tên Tài Khoản"]', account.username, { delay: 50 });

                // Điền 4 số cuối
                const digitInputs = await page.$$('form input[type="text"][maxlength="1"]');
                await sleep(3000);
                for (let i = 0; i < 4; i++) {
                    await digitInputs[i].type(account.digits[i]);
                    await sleep(500);
                }

                await sleep(2000);
                // Ấn nút xác nhận
                await page.click('form button[type=submit]');

                // Chờ swal2 xuất hiện
                await page.waitForSelector('.swal2-title', { timeout: 150000 });
                const title = await page.$eval('.swal2-title', el => el.textContent.trim());
                const container = await page.$eval('.swal2-html-container', el => el.textContent.trim());

                console.log(`📢 Kết quả cho ${account.username} (${title}): ${container}`);

                // Nếu thành công thì đánh dấu
                if (title.toLowerCase().includes('thành công')) {
                    successfulAccounts.add(account.username);
                }

                await sleep(1000)

                await page.click('.swal2-confirm');
                await sleep(3000);
            } catch (err) {
                console.error(`❌ Lỗi khi thử tài khoản ${account.username}: ${err.message}`);
            }

            // Xóa input trước tài khoản tiếp theo
            await page.evaluate(() => {
                const usernameInput = document.querySelector('form input[placeholder*="Tên Tài Khoản"]');
                if (usernameInput) usernameInput.value = '';
                const digitInputs = document.querySelectorAll('form input[type="text"][maxlength="1"]');
                digitInputs.forEach(input => input.value = '');
            });

            await sleep(2000);
        }
    }


    // await browser.close();
})();
