const fs = require('fs').promises;
const chalk = require('chalk')
const { RekognitionClient, DetectTextCommand } = require("@aws-sdk/client-rekognition")
const path = require("path")
const cheerio = require('cheerio');
const lockFile = require('proper-lockfile');
const configFile = './config/config.ini'; // Đường dẫn tới file config
const axios = require("axios")
const { execSync } = require('child_process');
const sharp = require('sharp');
const openai = require("./openai")

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

const processFailUser = async (inputFile, outputFile, username, teleId) => {
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
      newInputData = inputData.filter(user => !user.includes(username));

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

      outputData.push(username + " " + teleId);
      await fs.writeFile(outputFile, outputData.join('\n'), 'utf8');

    } finally {
      await lockFile.unlock(inputFile);
      await lockFile.unlock(outputFile);
    }

  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  }
};


async function writeFailedUser(inputFile, msg) {
  try {
    await fs.mkdir(path.dirname(inputFile), { recursive: true });
    await ensureFileExists(inputFile);
    await fs.appendFile(inputFile, msg + '\n');



  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  }
}

async function deleteAccs(inputFile, username) {
  let inputData = [];
  try {
    const inputContent = await fs.readFile(inputFile, 'utf8');
    inputData = inputContent.split('\n').map(line => line.trim()).filter(line => line);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error; // Bỏ qua nếu file không tồn tại
  }

  // Xóa username khỏi inputFile nếu cần
  let newInputData = inputData;
  newInputData = inputData.filter(user => !user.includes(username));

  await fs.writeFile(inputFile, newInputData.join('\n'), 'utf8');
}



const isNaturalNumber = (str) => {
  const num = Number(str);
  return Number.isInteger(num) && num >= 0;
};

function hasNumber(str) {
  return /\d/.test(str);
}



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
    // console.error('Lỗi:', error.message);
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


async function downloadSecondPhotoInAlbum(message, client) {
  if (!message.groupedId) return null; // Không phải album

  const messages = await client.getMessages(message.chatId, {
    limit: 2, // Tùy chỉnh theo số lượng gần nhất
  });

  const groupedMessages = messages.filter(
    m => m.groupedId?.toString() === message.groupedId.toString() && m.media?.photo
  );

  if (groupedMessages.length == 0) return null;

  const secondPhotoMessage = groupedMessages[0];
  const buffer = await client.downloadMedia(secondPhotoMessage.media, { workers: 1 });

  const filePath = `./photo_${secondPhotoMessage.id}.jpg`;
  await fs.writeFile(filePath, buffer);

  return filePath;
}


async function processText(text, lengthOfCode) {
  const matches = text.match(/[A-Za-z0-9]+/g) || [];

  const codes = matches.filter(word => {
    if (word.length !== lengthOfCode) return false;

    const lower = word.toLowerCase();

    // Loại bỏ nếu toàn số hoặc là "thuong" / "facebook"
    if (/^\d+$/.test(word)) return false;
    if (lower === 'thuong' || lower === 'facebook') return false;

    return true;
  });

  console.log(codes);
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


async function modifySvgBase64AndReturnPngBase64(svgBase64Full) {
  // Giải mã base64 thành chuỗi SVG
  const base64Data = svgBase64Full.replace(/^data:image\/svg\+xml;base64,/, '');
  const svgContent = Buffer.from(base64Data, 'base64').toString('utf-8');

  // Sử dụng cheerio để phân tích và chỉnh sửa SVG
  const $ = cheerio.load(svgContent, { xmlMode: true });

  // Lưu thông tin về các path và giá trị x nhỏ nhất để sắp xếp
  const paths = [];
  $('path').each((i, elem) => {
    if ($(elem).attr('fill') === 'none') {
      $(elem).remove();
      return;
    }

    const d = $(elem).attr('d');
    const coords = d.match(/[MLCQ]\s*([-+]?\d*\.?\d+)\s*[, ]\s*([-+]?\d*\.?\d+)/g) || [];
    let minX = Infinity;

    coords.forEach(coord => {
      const x = parseFloat(coord.match(/[-+]?\d*\.?\d+(?=\s*[, ])/)[0]);
      if (x < minX) minX = x;
    });

    if (minX === Infinity) minX = 0;

    paths.push({ index: i, minX, elem });
  });

  // Sắp xếp các path theo giá trị x nhỏ nhất (từ trái sang phải)
  paths.sort((a, b) => a.minX - b.minX);

  // Dịch chuyển các path với khoảng cách 100 đơn vị
  paths.forEach((pathInfo, newIndex) => {
    const elem = pathInfo.elem; // Truy cập elem từ pathInfo
    let d = $(elem).attr('d');

    // Thêm stroke="black"
    $(elem).attr('stroke', 'black');

    // Tính offset: path đầu tiên giữ nguyên (offset = 0), các path sau cách nhau 100 đơn vị
    const offset = newIndex * 30;

    // Dịch chuyển tất cả các tọa độ x trong d
    let modifiedD = d;

    // Biểu thức chính quy để bắt tất cả các cặp tọa độ x, y
    modifiedD = modifiedD.replace(
      /([MLCQ])\s*([-+]?\d*\.?\d+)\s*[, ]\s*([-+]?\d*\.?\d+)/g,
      (match, cmd, x, y) => {
        const newX = parseFloat(x) + offset;
        return `${cmd} ${newX.toFixed(2)} ${y}`;
      }
    );

    // Xử lý riêng cho Q và C vì chúng có nhiều cặp tọa độ hơn
    // Lặp lại để cập nhật các tọa độ tiếp theo trong Q (x2 y2)
    modifiedD = modifiedD.replace(
      /(Q\s*[-+]?\d*\.?\d+\s*[-+]?\d*\.?\d+)\s*([-+]?\d*\.?\d+)\s*[, ]\s*([-+]?\d*\.?\d+)/g,
      (match, prefix, x2, y2) => {
        const newX2 = parseFloat(x2) + offset;
        return `${prefix} ${newX2.toFixed(2)} ${y2}`;
      }
    );

    // Cập nhật thuộc tính d với giá trị đã dịch chuyển
    $(elem).attr('d', modifiedD);
  });

  // Cập nhật kích thước SVG để chứa tất cả các path sau khi dịch chuyển
  const totalWidth = 300; // 140 là chiều rộng ban đầu
  $('svg').attr('width', totalWidth);
  $('svg').attr('viewBox', `0,0,${totalWidth},56`);

  // Lấy lại nội dung SVG đã chỉnh sửa
  const modifiedSvgContent = $.html();

  // Tạo một tệp tạm để lưu SVG đã chỉnh sửa
  const randomId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const tempSvgPath = path.join(__dirname, `../temp/temp-${randomId}.svg`);
  const tempPngPath = path.join(__dirname, `../temp/temp-${randomId}.png`);

  // Ghi nội dung SVG đã chỉnh sửa vào file
  await fs.writeFile(tempSvgPath, modifiedSvgContent);

  // Sử dụng sharp để chuyển SVG thành PNG
  await sharp(tempSvgPath)
    .resize(totalWidth, 98, {
      fit: 'outside', // Đảm bảo toàn bộ nội dung được hiển thị
      background: '#ffffff'
    })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(tempPngPath);

  // Đọc file PNG và chuyển thành base64
  const pngBuffer = await fs.readFile(tempPngPath);
  const pngBase64 = pngBuffer.toString('base64');

  // Xóa file tạm
  await fs.unlink(tempSvgPath);
  await fs.unlink(tempPngPath);

  // Trả về base64 của ảnh PNG
  return `data:image/png;base64,${pngBase64}`;
}

async function solveCaptcha(imageBase64) {
  let readConfig = await loadConfig();
  let apiKey = readConfig.CAPTCHA_SOLVER;

  try {
    const response = await axios.post('https://api.capsolver.com/createTask',
      {
        "clientKey": apiKey,
        "task": {
          "type": "ImageToTextTask",
          "module": "module_007",
          "body": imageBase64
        }
      }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let result = response.data;

    if (result.errorId === 0) {
      let solution = result.solution;
      let answers = solution.answers;
      return answers[0];
    } else {
      console.error('Captcha API trả về lỗi:', response.data.message);
      return null;
    }

  } catch (error) {
    console.error('Lỗi khi gọi API:', error.response?.data || error.message);
    return null;
  }

}

async function solveCaptchaWithAntiCaptcha(imageBase64, modify = true) {
  let b64Modified = imageBase64;
  if (modify) {
    b64Modified = await modifySvgBase64AndReturnPngBase64(imageBase64)
  }
  let readConfig = await loadConfig();
  let apiKey = readConfig.ANTICAPTCHA_KEY;

  try {
    const response = await axios.post('https://anticaptcha.top/api/captcha',
      {
        "apikey": apiKey,
        "img": b64Modified
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      });

    let result = response.data;

    if (result.success === true) {
      return result.captcha;
    } else {
      console.error('Captcha API trả về lỗi:', result.message);
      return null;
    }

  } catch (error) {
    console.error('Lỗi khi gọi API:', error.response?.data || error.message);
    return null;
  }

}


async function solveCaptchaWithGPT(imageBase64) {
  let b64Modified = await modifySvgBase64AndReturnPngBase64(imageBase64)
  let readConfig = await loadConfig();
  let apiKey = readConfig.OPENAI;
  let prompt = "hình ảnh sau chứa captcha gì, chỉ trả về captcha đó"
  let captcha = await openai.getChatGptResponseImages(apiKey, prompt, [b64Modified])
  return captcha
}


async function createMTCaptchaTask(API_KEY, SITE_KEY, PAGE_URL) {
  const payload = {
    clientKey: API_KEY,
    "task": {
      "type": "MtCaptchaTaskProxyLess",
      "websiteURL": PAGE_URL,
      "websiteKey": SITE_KEY
    }
  };

  try {
    const response = await axios.post('https://api.capsolver.com/createTask', payload);
    if (response.data.errorId === 0) {
      console.log('Task created:', response.data.taskId);
      return response.data.taskId;
    } else {
      throw new Error(`Create task failed: ${JSON.stringify(response.data)}`);
    }
  } catch (err) {
    console.log(err)
    throw new Error(`Error creating task: ${err.message}`);
  }
}


async function getTaskResult(API_KEY, taskId) {
  const payload = {
    clientKey: API_KEY,
    taskId: taskId,
  };

  try {
    const response = await axios.post('https://api.capsolver.com/getTaskResult', payload);
    return response.data;
  } catch (err) {
    throw new Error(`Error getting task result: ${err.message}`);
  }
}

function hideLast3Chars(str) {
  if (str.length <= 3) {
    return '*'.repeat(str.length);
  }

  const visiblePart = str.slice(0, -3);
  const maskedPart = '*'.repeat(3);
  return visiblePart + maskedPart;
}


async function solveJ88Captcha(SITE_KEY, PAGE_URL) {
  let readConfig = await loadConfig();
  let API_KEY = readConfig.CAPTCHA_SOLVER;

  try {
    const taskId = await createMTCaptchaTask(API_KEY, SITE_KEY, PAGE_URL);
    // Đợi và kiểm tra kết quả
    const pollInterval = 100;
    const maxAttemp = 10;
    let attemp = 0;
    while (true && attemp <= maxAttemp) {
      console.log('Checking result...');
      const result = await getTaskResult(API_KEY, taskId);
      if (result.status === 'ready') {
        let solution = result.solution;
        console.log(solution)
        return solution.token;
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attemp++;

    }
  } catch (err) {
    console.error('Solve failed:', err.message);
  }
}

async function sendTelegramMessage(chatId, message, options = {}) {
  try {
    let config = await loadConfig()
    let BOT_TOKEN = config.BOT_TOKEN2
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: options.parse_mode || 'HTML',
      ...options,
    };

    const res = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, payload);
    return res.data;
  } catch (err) {
    console.error('❌ Lỗi gửi tin nhắn Telegram:', err.response?.data || err.message);
  }
}


function splitArrayInHalf(arr) {
  const mid = Math.ceil(arr.length / 2);
  const firstHalf = arr.slice(0, mid);
  const secondHalf = arr.slice(mid);

  return { firstHalf, secondHalf };
}





module.exports = {
  writeFailedUser, solveCaptchaWithAntiCaptcha, hideLast3Chars,
  solveCaptcha, processDoneUser, processText, processImage, isNaturalNumber, readFileToArray, loadConfig, fetchSpoilerText,
  getRandomElement, getRandomProxy, parseProxyString, shuffleArray, saveConfig, downloadMedia, fetchImage, solveCaptchaWithGPT,
  deleteAccs, sendTelegramMessage, solveJ88Captcha, hasNumber, downloadSecondPhotoInAlbum, splitArrayInHalf
}