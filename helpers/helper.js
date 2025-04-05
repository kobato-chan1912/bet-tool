const fs = require('fs').promises;
const chalk = require('chalk')
const { RekognitionClient, DetectTextCommand } = require("@aws-sdk/client-rekognition")
const path = require("path")
const cheerio = require('cheerio');
const lockFile = require('proper-lockfile');
const configFile = './config/config.ini'; // Đường dẫn tới file config
const axios = require("axios")
const { execSync } = require('child_process');

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getRandomProxy(filePath = './config/proxies.txt') {
  try {
    // Đọc nội dung file
    const data = await fs.readFile(filePath, 'utf8');

    // Tách từng dòng (loại bỏ dòng trống)
    const proxies = data.split('\n').map(line => line.trim()).filter(line => line);

    if (proxies.length === 0) {
      throw new Error('Không có proxy nào trong file!');
    }

    // Chọn ngẫu nhiên một proxy
    return proxies[Math.floor(Math.random() * proxies.length)];
  } catch (error) {
    console.error('Lỗi khi lấy proxy:', error.message);
    return null;
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // Chọn ngẫu nhiên chỉ số từ 0 đến i
    [array[i], array[j]] = [array[j], array[i]]; // Hoán đổi vị trí phần tử
  }
  return array;
}


// 🛠 Hàm xử lý proxy
const parseProxyString = (proxyString) => {
  if (!proxyString) return null;
  try {
    const [auth, hostPort] = proxyString.split('@');
    const [username, password] = auth.split(':');
    const [host, port] = hostPort.split(':');
    return {
      protocol: "http",
      host,
      port: parseInt(port, 10),
      auth: { username, password }
    };
  } catch (error) {
    console.error('❌ Lỗi xử lý proxy:', error.message);
    return null;
  }
};


const ensureFileExists = async (filePath) => {
  try {
    await fs.access(filePath); // Kiểm tra file có tồn tại không
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(filePath, '', 'utf8'); // Nếu chưa có, tạo file rỗng
    } else {
      throw error; // Nếu lỗi khác, ném lỗi
    }
  }
};


const processDoneUser = async (inputFile, outputFile, username, point, status = 0) => {
  try {
    // Đảm bảo thư mục tồn tại
    await fs.mkdir(path.dirname(inputFile), { recursive: true });
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await ensureFileExists(inputFile);
    await ensureFileExists(outputFile);

    // Dùng Lock để tránh mất dữ liệu khi ghi file
    await lockFile.lock(inputFile);
    await lockFile.lock(outputFile);

    try {
      // Đọc dữ liệu từ inputFile
      let inputData = [];
      try {
        const inputContent = await fs.readFile(inputFile, 'utf8');
        inputData = inputContent.split('\n').map(line => line.trim()).filter(line => line);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error; // Bỏ qua nếu file không tồn tại
      }

      // Xóa username khỏi inputFile nếu cần
      let newInputData = inputData;
      if (status == 0) {
        newInputData = inputData.filter(user => !user.includes(username));
      }

      await fs.writeFile(inputFile, newInputData.join('\n'), 'utf8');

      // Đọc dữ liệu từ outputFile
      let outputData = [];
      try {
        const outputContent = await fs.readFile(outputFile, 'utf8');
        outputData = outputContent.split('\n').map(line => line.trim()).filter(line => line);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error; // Bỏ qua nếu file không tồn tại
      }

      // Nếu username chưa có trong outputFile, thêm vào

      outputData.push(username + ": " + point);
      await fs.writeFile(outputFile, outputData.join('\n'), 'utf8');

      // if (!outputData.some(line => line.startsWith(username + ":"))) {
      //   outputData.push(username + ": " + point);
      //   await fs.writeFile(outputFile, outputData.join('\n'), 'utf8');
      // }
    } finally {
      await lockFile.unlock(inputFile);
      await lockFile.unlock(outputFile);
    }

  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  }
};



const isNaturalNumber = (str) => {
  const num = Number(str);
  return Number.isInteger(num) && num >= 0;
};


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



async function fetchSpoilerText(url) {
  try {
    // const url = 'https://t.me/J88COM_NOHU_BANCA/4963?embed=1'; // lấy id = message.id
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0' // Giúp tránh bị chặn
      }
    });

    const $ = cheerio.load(data);

    const rawHtml = $('.tgme_widget_message_text').html(); // Lấy HTML thay vì text
    const formattedText = rawHtml
        .replace(/<br\s*\/?>/gi, '\n') // Chuyển <br> thành xuống dòng
        .replace(/<\/?[^>]+(>|$)/g, '') // Bỏ các thẻ HTML khác như <span>, <b>, etc.
        .trim();

    return formattedText

    
  } catch (error) {
    console.error('Lỗi:', error.message);
    return null

  }
}


async function fetchImage(url) {
  try {
    // Lấy HTML từ URL
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0' // Giúp tránh bị chặn
      }
    });

    // Parse HTML với cheerio
    const $ = cheerio.load(data);

    // Lấy URL ảnh từ style background-image
    const photoWrap = $('.tgme_widget_message_photo_wrap');
    const style = photoWrap.attr('style');
    const imageUrlMatch = style.match(/url\('(.+?)'\)/);
    if (!imageUrlMatch) {
      throw new Error('Không tìm thấy URL ảnh');
    }

    const imageUrl = imageUrlMatch[1];

    // Tải ảnh về
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // Tạo tên file từ timestamp để tránh trùng
    const fileName = `image_${Date.now()}.jpg`;
    const filePath = "./" + fileName;


    // Ghi file ảnh xuống đĩa
    await fs.writeFile(filePath, Buffer.from(response.data));

    return filePath;

  } catch (error) {
    return null;
  }
}



async function downloadMedia(message, client) {
  if (message.media) {
    const photo = message.media.photo;
    const document = message.media.document;
    const buffer = await client.downloadMedia(message.media, {
      workers: 1, // Số lượng worker tải xuống
    });

    let filePath;

    if (photo) {
      filePath = `./photo_${photo.id}.jpg`; // Đổi đường dẫn nếu cần
      await fs.writeFile(filePath, buffer);
      return filePath;
    }

    else if (document) {
      filePath = `./video_${document.id}.mp4`
      imgPath = `./video_${document.id}.jpg`
      await fs.writeFile(filePath, buffer);
      execSync(`ffmpeg -i ${filePath} -frames:v 1 -q:v 2 ${imgPath}`)
      await fs.unlink(filePath)
      return imgPath
    }

  }

  return null
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



async function processImage(imagePath, lengthOfCode) {
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

    const regex = new RegExp(`^[A-Za-z0-9]{${lengthOfCode}}$`);
    const codes = result.TextDetections
      .filter(d => d.Type === 'WORD')
      .map(d => d.DetectedText)
      .filter(word => regex.test(word));

    console.log(chalk.blue(`🔍 Code phát hiện: ${codes.join(', ')}`));
    try {
      await fs.unlink(imagePath)
    } catch (error) { }


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


async function solveCaptcha(imageBase64) {
  let readConfig = await loadConfig();
  let apiKey = readConfig.CAPTCHA_KEY;

  try {
    const response = await axios.post('https://autocaptcha.pro/apiv3/process', {
      key: apiKey,
      type: 'imagetotext',
      img: imageBase64
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    let data = response.data;
    if (!data.captcha) throw new Error(`❌ Lỗi lấy kết quả captcha`);
    return data.captcha;
  } catch (error) {
    console.error('Lỗi giải Captcha:', error.response?.data || error.message);
    return null;
  }
}

async function solveTurnstile(SITE_KEY, PAGE_URL) {
  let readConfig = await loadConfig();
  let API_KEY = readConfig.ANTICAPTCHA_KEY;

  try {
    // Bước 1: Gửi yêu cầu giải Captcha
    let response = await axios.post("https://anticaptcha.top/api/captcha", {
      apikey: API_KEY,
      type: 23,
      websitekey: SITE_KEY,
      pageurl: PAGE_URL
    });

    if (!response.data.success) {
      console.log("Lỗi khi gửi yêu cầu Captcha:", response.data);
      return null;
    }
    let captchaData = JSON.parse(response.data.captcha);


    let token = captchaData.token;
    return token;
  } catch (error) {
    console.error("Lỗi khi xử lý Captcha:", error.message);
  }
}




const sleep = ms => new Promise(res => setTimeout(res, ms));


module.exports = {
  solveCaptcha, processDoneUser, processText, processImage, isNaturalNumber, readFileToArray, loadConfig, fetchSpoilerText,
  getRandomElement, getRandomProxy, parseProxyString, shuffleArray, saveConfig, downloadMedia, fetchImage, solveTurnstile
}