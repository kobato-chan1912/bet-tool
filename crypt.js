const CryptoJS = require("crypto-js");

const md5 = require("md5")

const key_free = "att.code.free-code.new-88@2030$"; // key_free từ information.js
const md5Key = md5(key_free).toLowerCase(); // Mã hóa MD5 key_free

const promo_code = "xxx";
const text = JSON.stringify({ promo_code });

const encryptedKey = CryptoJS.AES.encrypt(text, md5Key).toString();

console.log("Key gửi lên API:", encryptedKey);
