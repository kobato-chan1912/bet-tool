const axios = require('axios');
const cheerio = require('cheerio');

async function fetchSpoilerText(url) {
  try {
    // const url = 'https://t.me/J88COM_NOHU_BANCA/4963?embed=1';
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

fetchSpoilerText();
