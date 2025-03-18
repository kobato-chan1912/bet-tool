const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const fs = require('fs').promises;
const chalk = require('chalk')
const vision = require('@google-cloud/vision');
const axios = require('axios');
const pLimit = require('p-limit');
const puppeteer = require('puppeteer');
const CryptoJS = require("crypto-js");
const md5 = require("md5")
const { RekognitionClient, DetectTextCommand }  = require("@aws-sdk/client-rekognition")
const os = require("os")
const path = require("path")



const configFile = 'config/config.ini'; // Đường dẫn tới file config
const serviceAccountPath = "config/api-google.json"






async function readFileToArray(filePath) {
  try {
    // Đọc nội dung file
    const content = await fs.readFile(filePath, 'utf8');
    // Chia thành mảng và loại bỏ dòng trống
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    return lines;
  } catch (error) {
    console.error('Lỗi đọc file:', error);
    return [];
  }
}


// data input
const hi88IDs = ["2321421266", "2018121888", "1628875713"]
const q88IDS = ['2446066378', '2272716520', '2421765170']
const f88IDS = ['2321837001']
const new88IDS = ['2332416396']

// test group: 2673391905 

// Hàm đọc config từ file dạng key=value
async function loadConfig() {
  try {
    const data = await fs.readFile(configFile, 'utf8');
    const config = {};
    data.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    });
    return config;
  } catch (err) {
    // Nếu file không tồn tại, trả về config rỗng
    return {};
  }
}

async function solveCaptcha(imageBase64) {
  let readConfig = await loadConfig()
  let apiKey = readConfig.CAPTCHA_KEY;
  try {
    const response = await axios.post('https://autocaptcha.pro/apiv3/process', {
      key: apiKey,
      type: 'imagetotext',
      img: imageBase64
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let data = response.data; // Kết quả từ API
    if (data.captcha == null) {
      throw new Error(`❌ Lỗi lấy kết quả captcha`);
    } else {
      return data.captcha
    }
  } catch (error) {
    console.error('Lỗi giải Captcha:', error.response?.data || error.message);
    return null;
  }
}


async function processImage(imagePath) {
  try {
    const client = new vision.ImageAnnotatorClient({
      keyFilename: "api-google.json"
    });
    const [result] = await client.textDetection(imagePath);
    const detections = result.textAnnotations;
    const codes = detections
      .map(text => text.description)
      .filter(text => /^[A-Za-z0-9]{8}$/.test(text));

    console.log(chalk.blue(`🔍 Code phát hiện: ${codes.join(', ')}`));
    return codes;
  } catch (error) {
    console.error(chalk.red('❌ Lỗi nhận diện hình ảnh:'), error);
    return [];
  }
}


async function processText(text, lengthOfCode) {
  const regex = new RegExp(`^[A-Za-z0-9]{${lengthOfCode}}$`); // Regex động với độ dài tùy chỉnh
  const codes = text
    .split(/\s+/) // Tách chuỗi thành từng từ
    .filter(word => regex.test(word)); // Lọc các từ có độ dài đúng với biến `length`


  console.log(chalk.blue(`🔍 Code phát hiện: ${codes.join(', ')}`));
  return codes;
}


// Hàm lưu config vào file
async function saveConfig(config) {
  const configContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  await fs.writeFile(configFile, configContent, 'utf8');
}



  async function processImage(imagePath) {
    try {
      
      let readConfig = await loadConfig();
      let accessKeyId = readConfig.AWS_ACCESS_KEY
      let secretAccessKey = readConfig.AWS_SECRET_KEY
      const client = new RekognitionClient({
        region: "ap-southeast-1",
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey
        }
      });
      

      // Đọc file ảnh và chuyển thành buffer
      const imageBuffer = await fs.readFile(imagePath);
   
  
      // Gửi request đến Amazon Rekognition
      const command = new DetectTextCommand({
        Image: { Bytes: imageBuffer }
      });
  
  
      const result = await client.send(command);
  
      // Trích xuất văn bản từ response
      const codes = result.TextDetections
        .filter(d => d.Type === 'WORD')
        .map(d => d.DetectedText)
        .filter(text => /^[A-Za-z0-9]{8}$/.test(text));
  
      console.log(chalk.blue(`🔍 Code phát hiện: ${codes.join(', ')}`));
      return codes;
    } catch (error) {
      console.error(chalk.red('❌ Lỗi nhận diện hình ảnh:'), error);
      return [];
    }
  }

async function getResult(page) {
  const titleText = await page.$eval('#swal2-title', el => el.textContent.trim()).catch(() => null);
  const containerText = await page.$eval('#swal2-html-container', el => el.textContent.trim()).catch(() => null);

  if (titleText && containerText) {
    return `${titleText} - ${containerText}`;
  } else {
    return "Không thấy kết quả!";
  }
}


const sleep = ms => new Promise(res => setTimeout(res, ms));

async function enterHi88Code(user, codes) {

  let browserOptions = {
    headless: false
  };

  if (os.platform() === 'win32') {
    browserOptions.executablePath = path.join('chrome', 'chrome.exe');
  }


  const browser = await puppeteer.launch(browserOptions);
  const page = await browser.newPage();


  for (const code of codes) {
    try {
      console.log(chalk.yellow(`➡ Nhập mã Hi88 ${code} cho user ${user}`));

      await page.goto('https://freecode-hi88.pages.dev/', {
        waitUntil: 'networkidle0'
      });

      // Nhập mã vào input
      await page.type('#code-id', code);
      await page.click('#submit-btn');

      // Lấy text từ captcha
      await page.waitForSelector('#captcha');
      const captchaText = await page.$eval('#captcha', el => el.innerText);
      console.log(chalk.magenta(`🔠 Captcha: ${captchaText}`));

      await page.type("#captcha-input", captchaText, { delay: 500 });

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
        console.log(`✅ Hi88 Kết quả nhập mã ${code} cho ${user}: ` + result)

      } catch (error) {
        let result = await getResult(page)
        console.log(`⚠️ Hi88 Kết quả nhập mã ${code} cho ${user}: ` + result)
      }



      // Chờ 3 giây
    } catch (error) {

      console.error(chalk.red(`❌ Lỗi Hi88: `), error);
    }
  }

  await browser.close();
}

async function enterF88Code(user, codes) { // https://f8bet01.co/CODE
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();


  for (const code of codes) {
    try {
      console.log(chalk.yellow(`➡ Nhập mã F88 ${code} cho user ${user}`));

      await page.goto('https://f8bet01.co/CODE', {
        waitUntil: 'networkidle0'
      });

      // Nhập mã vào input
      await page.type('#code-id', code);
      await page.click('#submit-btn');

      // Lấy text từ captcha
      await page.waitForSelector('#captcha-image');
      const captchaImage = await page.$eval('#captcha-image', el => el.src);
      const captchaText = await solveCaptcha(captchaImage);
      console.log(chalk.magenta(`🔠 Captcha: ${captchaText}`));

      await page.type("#captcha-input", captchaText.toUpperCase(), { delay: 500 });
      await page.click("#verify-captcha")

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
        console.log(`✅ F88 Kết quả nhập mã ${code} cho ${user}: ` + result)


      } catch (error) {
        let result = await getResult(page)
        console.log(`⚠️ F88 Kết quả nhập mã ${code} cho ${user}: ` + result)
      }



      // Chờ 3 giây
    } catch (error) {

      console.error(chalk.red(`❌ Lỗi F88:`), error);
    }
  }

  await browser.close();
}

async function enterQ88Code(user, codes) { // https://qq88km8.com
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();


  for (const code of codes) {
    try {
      console.log(chalk.yellow(`➡ Nhập mã Q88 ${code} cho user ${user}`));

      await page.goto('https://qq88km8.com/', {
        waitUntil: 'networkidle0'
      });

      // Nhập mã vào input
      await page.type('#promo-code', code);
      await page.click('.button-ktn');

      // Lấy text từ captcha
      await page.waitForSelector('#captcha-image');
      const captchaImage = await page.$eval('#captcha-image', el => el.src);
      const captchaText = await solveCaptcha(captchaImage);
      console.log(chalk.magenta(`🔠 Captcha: ${captchaText}`));

      await page.type("#captcha-input", captchaText.toUpperCase(), { delay: 500 });
      await page.click("#verify-captcha")

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
        console.log(`✅ Q88 Kết quả nhập mã ${code} cho ${user}: ` + result)

      } catch (error) {
        let result = await getResult(page)
        console.log(`⚠️ Q88 Kết quả nhập mã ${code} cho ${user}: ` + result)
      }



      // Chờ 3 giây
    } catch (error) {

      console.error(chalk.red(`❌ Lỗi Q88:`), error);
    }
  }

  await browser.close();
}


async function enterNew88Code(user, codes) { // https://freecode-new88.pages.dev
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();


  for (const code of codes) {
    try {
      console.log(chalk.yellow(`➡ Nhập mã New88 ${code} cho user ${user}`));

      await page.goto('https://freecode-new88.pages.dev/', {
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

      await page.type("#captcha-input", captchaText.toUpperCase(), { delay: 500 });
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
        console.log(`✅ New88 Kết quả nhập mã ${code} cho ${user}: ` + result)

      } catch (error) {
        let result = await getResult(page)
        console.log(`⚠️ New88 Kết quả nhập mã ${code} cho ${user}: ` + result)
      }



      // Chờ 3 giây
    } catch (error) {

      console.error(chalk.red(`❌ Lỗi New88:`), error);
    }
  }

  await browser.close();
}


(async () => {
  // Đọc config từ file
  const config = await loadConfig();

  // Lấy API_ID và API_HASH từ config, nếu không có thì dùng mặc định
  const apiId = parseInt(config.API_ID);
  const apiHash = config.API_HASH;
  const captchaKey = config.CAPTCHA_KEY
  let stringSession;

  if (apiId == null || apiHash == null) {
    console.log(chalk.redBright('\n❌ Vui lòng cấu hình API_ID và API_HASH trước khi chạy!'));
    return;
  }

  // Kiểm tra trường SESSION trong config
  if (!config.SESSION || config.SESSION === null) {
    // Nếu không có SESSION, yêu cầu đăng nhập
    stringSession = new StringSession('');
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: async () => await input.text('Nhập số điện thoại (+84xxxx): '),
      password: async () => await input.text('Nhập mật khẩu (nếu có): '),
      phoneCode: async () => await input.text('Nhập mã xác nhận (mở app telegram): '),
      onError: (err) => console.log('Lỗi:', err),
    });


    console.log(chalk.greenBright('\n✅ Kết nối Telegram thành công!'));

    // Lưu session vào config
    config.SESSION = client.session.save();
    await saveConfig(config);

  } else {
    // Nếu đã có SESSION, sử dụng nó
    stringSession = new StringSession(config.SESSION);
  }

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log(chalk.greenBright('\n✅ Đang kết nối ... '));
  await sleep(10000)
  console.log(chalk.greenBright('\n✅ Bắt đầu nhận tin nhắn!'));

  // Lắng nghe tin nhắn mới từ channel
  client.addEventHandler(async (update) => {
    if (update.className === 'UpdateNewChannelMessage') {
      const message = update.message;
      const sendID = message.peerId.channelId.toString();




      // if (hi88IDs.includes(Number(sendID)) && message.message.includes("https://freecode-hi88.pages.dev")) 


      if (hi88IDs.includes(sendID) && message.message.includes("freecode-hi88.pages.dev")) {
        console.log(chalk.greenBright(`\n📥 Code mới từ hi88`));
        console.log(chalk.white(`\n${message.message}`));

        if (message.media) {
          const photo = message.media.photo;
          const buffer = await client.downloadMedia(message.media, {
            workers: 1, // Số lượng worker tải xuống
          });

          const imagePath = `photo_${photo.id}.jpg`; // Đổi đường dẫn nếu cần

          await fs.writeFile(imagePath, buffer);

          const codes = await processImage(imagePath);
          if (codes.length === 0) {
            console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ trong ảnh!'));
            return;
          }

          await fs.unlink(imagePath)



          const hi88Users = await readFileToArray("config/hi88.txt")
          // let limit = pLimit(hi88Users.length);
          let limit = pLimit(3);
          const tasks = hi88Users.map(user => limit(() => enterHi88Code(user, codes)));
          await Promise.all(tasks);

        } else {
          console.log(chalk.red('⚠ Không tìm thấy ảnh trong tin nhắn!'));
          return;
        }


      }


      if (q88IDS.includes(sendID) && message.message.includes("qq88km8.com")) {
        console.log(chalk.greenBright(`\n📥 Code mới từ Q88`));
        console.log(chalk.white(`\n${message.message}`));

        if (message.media) {
          const photo = message.media.photo;
          const buffer = await client.downloadMedia(message.media, {
            workers: 1, // Số lượng worker tải xuống
          });

          const imagePath = `photo_${photo.id}.jpg`; // Đổi đường dẫn nếu cần

          await fs.writeFile(imagePath, buffer);

          const codes = await processImage(imagePath);
          if (codes.length === 0) {
            console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ trong ảnh!'));
            return;
          }
          await fs.unlink(imagePath)


          const q88Users = await readFileToArray("config/q88.txt")
          // let limit = pLimit(q88Users.length);
          let limit = pLimit(3);
          const tasks = q88Users.map(user => limit(() => enterQ88Code(user, codes)));
          await Promise.all(tasks);

        } else {
          console.log(chalk.red('⚠ Không tìm thấy ảnh trong tin nhắn!'));
          return;
        }


      }


      if (f88IDS.includes(sendID) && message.message.includes("f8bet01.co/CODE")) { // f8bet01.co/CODE
        console.log(chalk.greenBright(`\n📥 Code mới từ F88`));
        console.log(chalk.white(`\n${message.message}`));

        if (message.media) {
          const photo = message.media.photo;
          const buffer = await client.downloadMedia(message.media, {
            workers: 1, // Số lượng worker tải xuống
          });

          const imagePath = `photo_${photo.id}.jpg`; // Đổi đường dẫn nếu cần

          await fs.writeFile(imagePath, buffer);

          const codes = await processImage(imagePath);
          if (codes.length === 0) {
            console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ trong ảnh!'));
            return;
          }
          await fs.unlink(imagePath)



          const f88Users = await readFileToArray("config/f88.txt")
          // let limit = pLimit(f88Users.length);
          let limit = pLimit(3);
          const tasks = f88Users.map(user => limit(() => enterF88Code(user, codes)));
          await Promise.all(tasks);

        } else {
          console.log(chalk.red('⚠ Không tìm thấy ảnh trong tin nhắn!'));
          return;
        }


      }


      if (new88IDS.includes(sendID) && message.message.includes("CODE may mắn")) { // CODE may mắn
        console.log(chalk.greenBright(`\n📥 Code mới từ New88`));
        console.log(chalk.white(`\n${message.message}`));
        let messageContent = message.message;


        const codes = await processText(messageContent, 10);
        if (codes.length === 0) {
          console.log(chalk.red('⚠ Không tìm thấy mã hợp lệ!'));
          return;
        }


        const new88Users = await readFileToArray("config/new88.txt")
        // let limit = pLimit(new88Users.length);

        let limit = pLimit(3);
        const tasks = new88Users.map(user => limit(() => enterNew88Code(user, codes)));
        await Promise.all(tasks);


      }



    }
  });

  // Giữ chương trình chạy để lắng nghe
  await new Promise(() => { });
})();