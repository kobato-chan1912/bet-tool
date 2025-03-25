const fs = require('fs').promises;
const chalk = require('chalk')
const { RekognitionClient, DetectTextCommand } = require("@aws-sdk/client-rekognition")
const path = require("path")
const cheerio = require('cheerio');
const lockFile = require('proper-lockfile');
const configFile = './config/config.ini'; // Đường dẫn tới file config
const axios = require("axios")

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

// 🛠 Hàm xử lý proxy
const parseProxyString = (proxyString) => {
    if (!proxyString) return null;
    try {
        const [auth, hostPort] = proxyString.split('@');
        const [username, password] = auth.split(':');
        const [host, port] = hostPort.split(':');
        return {
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

async function fetchSpoilerText(url) {
  try {
    // const url = 'https://t.me/J88COM_NOHU_BANCA/4963?embed=1'; // lấy id = message.id
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0' // Giúp tránh bị chặn
      }
    });

    const $ = cheerio.load(data);
    const spoilerText = $('tg-spoiler').text().trim(); // Lấy nội dung

    return spoilerText;
  } catch (error) {
    console.error('Lỗi:', error.message);
    return null

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


module.exports = { solveCaptcha, processDoneUser, processText, processImage, isNaturalNumber, readFileToArray, loadConfig, fetchSpoilerText, 
  getRandomElement, getRandomProxy, parseProxyString }