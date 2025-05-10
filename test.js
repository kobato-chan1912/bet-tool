const cheerio = require('cheerio');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const helper = require("./helpers/helper.js");
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');


const information = {
  site: "new88",
  endpoint: "https://api-code.khuyenmainew88.net",
  key_free: "att.code.free-code.new-88@2030$",
};


const getCaptchaToken = async () => {
  try {
    let proxy = await helper.getRandomProxy();
    const agent = new HttpsProxyAgent(`http://${proxy}`);
    const response = await axios.get(
      `${information.endpoint}/api/get-verification-code?site=${information.site}`,
      {
        headers: { 'Content-Type': 'application/json' },
        httpsAgent: agent
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting captcha token:', error.message);
    throw error;
  }
};

const SAVE_DIR = path.join(__dirname, 'captchas');
async function saveSvgAsPng(svgData, filename) {
  const svgBuffer = Buffer.from(svgData, 'base64');
  const outputPath = path.join(SAVE_DIR, filename);
  await sharp(svgBuffer).png()
  .resize(298, 98, {
    fit: 'contain', // Giữ tỉ lệ trong khung
    background: '#ffffff' // Nền trắng
  })
  .flatten({ background: '#ffffff' }) // Đảm bảo nền trắng nếu SVG trong suốt
  .png()
  .toFile(outputPath);
  return outputPath;
}



async function main() {
  await fs.mkdir(SAVE_DIR, { recursive: true });

  const TEST = 100;

  for (let i = 1; i <= TEST; i++) {
    try {
      const token = await getCaptchaToken();
      const base64Svg = token.captchaUrl
      const solvedText = await helper.solveCaptchaWithAntiCaptcha(base64Svg);
      const pngFilename = `${solvedText}.png`;

      const base64SvgBody = token.captchaUrl.replace(/^data:image\/svg\+xml;base64,/, '');
      await saveSvgAsPng(base64SvgBody, pngFilename);
      console.log(`[${i}/100] ✅ Saved: ${pngFilename}`);
    } catch (error) {
      console.error(`[${i}/100] ❌ Error: ${error}`);
    }
  }



}

main()