const axios = require('axios');
const helper = require("./helpers/helper.js")
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const cheerio = require('cheerio');


async function fetchAllText(url) {
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

        console.log(formattedText);

        // console.log(spoilerText)
        // return spoilerText;
    } catch (error) {
        console.error('Lỗi:', error.message);
        return null

    }
}

fetchAllText("https://t.me/J88COM_NOHU_BANCA/5826?embed=1")