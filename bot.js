const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const helper = require("./helpers/helper.js")

const fee = {
    'j88.txt': 6000,
    '8k.txt': 5000,
    'new88.txt': 12000,
    'f8.txt': 10000,
    'sh.txt': 7000,
    'f168.txt': 10000,
    'mb66.txt': 10000,
};


const fileGroups = {
    j88: ['j88.txt'],
    '8k': ['8k.txt'],
    new88: ['new88.txt'],
    f8: ['f8.txt', 'f8-failed.txt'],
    f168: ['f168.txt'],
    sh: ['sh.txt'],
    mb66: ['mb66.txt']
};


async function main() {
    let config = await helper.loadConfig()
    const token = config.BOT_TOKEN;
    const bot = new TelegramBot(token, { polling: true });

    // Đường dẫn file
    const balancePath = path.join(__dirname, 'database', 'balances.json');
    const processedPath = path.join(__dirname, 'database', 'processed.json');

    // Tải dữ liệu đã lưu
    let balances = loadJSON(balancePath);
    let processed = new Set(loadJSON(processedPath));

    // Load file JSON
    function loadJSON(filePath) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (err) {
            return filePath.includes('processed') ? [] : {};
        }
    }

    // Lưu file JSON
    function saveJSON(filePath, data) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    // Hiện menu
    bot.setMyCommands([
        { command: '/start', description: 'Bắt đầu' },
    ])




    function showMenu(chatId, showText = 1) {
        let text = `BOT CODE GAME : J88,8K,F8,New
🪪 Nạp tiền
👉 Chọn game
⏳ Chờ code
💰Nhận thưởng
🎮 Chơi
Kênh  : https://t.me/+3E1oOkivHJI5ZjBl
BOT : @HUNTER_CODE_DEN_BOT
`;
        if (showText == 0) {
            text = '\u2063'
        }
        bot.sendMessage(chatId, text, {
            reply_markup: {
                keyboard: [
                    ['💰 Xem số dư', '💸 Nạp tiền', '♻️ Hoàn tiền'],
                    ['➕ Thêm Acc SHBet', '➕ Thêm Acc 8K'],
                    ['➕ Thêm Acc New88', '➕ Thêm Acc F8', '➕ Thêm Acc MB66']
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });
    }


    // Kiểm tra giao dịch và cập nhật số dư
    const checkAndUpdateBalance = async () => {
        try {
            const res = await axios.get(config.BANK_API);
            const transactions = res.data.transactions || [];
            balances = loadJSON(balancePath);
            processed = new Set(loadJSON(processedPath));

            transactions.forEach(tx => {
                if (tx.type === 'IN' && !processed.has(tx.transactionID)) {
                    const desc = tx.description.toLowerCase();
                    const match = desc.match(/naptienbot\s+([a-zA-Z0-9_]{3,})/);

                    if (match) {
                        const username = match[1];

                        if (!balances[username]) balances[username] = 0;
                        balances[username] += tx.amount;

                        processed.add(tx.transactionID);
                        saveJSON(balancePath, balances);
                        saveJSON(processedPath, Array.from(processed));
                    }
                }
            });

        } catch (err) {
            console.error('Lỗi khi gọi API:', err.message);
        }
    };

    // Kiểm tra mỗi 10 giây
    setInterval(checkAndUpdateBalance, 30000);

    // Lệnh /start
    bot.onText(/\/start/, (msg) => {
        showMenu(msg.chat.id);
    });

    // Xử lý tin nhắn
    const userStates = {};
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text ?? '';
        const username = msg.from.username?.toLowerCase();


        if (!username) {
            return bot.sendMessage(chatId, 'Bạn cần đặt username Telegram để sử dụng bot.');
        }


        // xử lý hoàn tiền
        const refundMatch = text.match(/^\/hoantien\s+(j88|8k|f168|new88|f8|sh|mb66)\s+(\S+)/i);

        if (refundMatch) {
            const loai = refundMatch[1].toLowerCase();
            const acc = refundMatch[2];
            const userId = username;



            const feeMap = fee;
            const relatedFiles = fileGroups[loai];
            let targetFile = null;
            let targetLine = null;

            // Tìm file chứa dòng acc cần hoàn
            for (const fileName of relatedFiles) {
                const filePath = path.join(__dirname, 'config', fileName);
                if (!fs.existsSync(filePath)) continue;

                const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
                const line = lines.find(line => line.includes(acc) && line.includes(userId));

                if (line) {
                    targetFile = filePath;
                    targetLine = line;
                    break;
                }
            }

            if (!targetLine) {
                return bot.sendMessage(chatId, `⚠️ Không tìm thấy acc "${acc}" của bạn trong danh sách ${loai}.`);
            }

            // Hoàn tiền 70%
            const refundAmount = Math.floor(feeMap[`${loai}.txt`] * 0.7);

            // Cập nhật số dư
            const balancesPath = path.join(__dirname, 'database', 'balances.json');
            const balances = fs.existsSync(balancesPath) ? JSON.parse(fs.readFileSync(balancesPath)) : {};
            balances[userId] = (balances[userId] || 0) + refundAmount;
            fs.writeFileSync(balancesPath, JSON.stringify(balances, null, 2));

            // Xóa dòng khỏi file gốc
            const lines = fs.readFileSync(targetFile, 'utf8').split('\n').filter(Boolean);
            const newLines = lines.filter(line => line !== targetLine);
            fs.writeFileSync(targetFile, newLines.join('\n'));

            return bot.sendMessage(chatId, `✅ Đã hoàn lại ${refundAmount.toLocaleString()}đ cho acc <b>${acc}</b> (${loai})\n\n💰 Số dư mới của bạn sẽ được cập nhật muộn nhất sau 30 giây.`, { parse_mode: 'HTML' });
        }




        switch (text) {
            case '💰 Xem số dư':
                userStates[chatId] = 'info'
                // await checkAndUpdateBalance();
                const balance = balances[username] || 0;
                bot.sendMessage(chatId, `💰 *Số dư của bạn:*  ${balance.toLocaleString()}  đồng`, { parse_mode: 'Markdown' });
                break;
            case '💸 Nạp tiền':
                userStates[chatId] = 'deposit'
                const qrLink = `https://img.vietqr.io/image/acb-${config.BANK}-compact.jpg?addInfo=naptienbot ${username}`;
                bot.sendPhoto(chatId, qrLink, {
                    caption: `💸 **Thanh toán nhanh chóng!**
                
✅ **Nội dung chuyển khoản:**  naptienbot ${username}
                
⏳ Tiền sẽ được cộng tự động sau vài phút!`,
                    parse_mode: 'Markdown'
                });
                break;


            case '♻️ Hoàn tiền':
                const userId = username;
                const configPath = path.join(__dirname, 'config');



                let response = `🔁 Các tài khoản bạn đã thêm:\n\n`;
                let found = false;

                Object.entries(fileGroups).forEach(([type, fileList]) => {
                    let userLines = [];

                    fileList.forEach(file => {
                        const filePath = path.join(configPath, file);
                        if (!fs.existsSync(filePath)) return;

                        const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
                        userLines.push(...lines.filter(line => line.includes(userId)));
                    });

                    if (userLines.length > 0) {
                        found = true;
                        response += `📂 <b>${type.toUpperCase()}</b>\n`;
                        userLines.forEach(line => {
                            const acc = line.split(' ')[0].trim(); // Chỉ lấy tên acc
                            response += `— <code>${acc}</code>\n`;
                        });
                        response += `📥 Hoàn tiền lệnh: <code>/hoantien ${type} têntk</code>\n\n`;
                    }
                });

                if (!found) {
                    bot.sendMessage(chatId, '🔍 Không tìm thấy tài khoản nào bạn đã thêm.', { parse_mode: 'HTML' });
                } else {
                    bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
                }
                break;



            case '➕ Thêm Acc J88':
                userStates[chatId] = 'awaiting_j88';
                bot.sendMessage(chatId, `📝 **Gửi thông tin tài khoản J88 của bạn**

💰 6k / code

📋 **Cú pháp (mỗi hàng là một tài khoản, có thể cài nhiều tài khoản):**  

\`\`\` 
<username> <4 số cuối ngân hàng> 
\`\`\`

✅ **Ví dụ:**

tuanlong 5570
nguyentri 5560


⚠️ **Lưu ý:** 

- Kiểm tra kỹ tài khoản lạm dụng trước khi gửi.  
- Gửi sai cú pháp hoặc tài khoản bị lạm dụng sẽ **không được hoàn tiền**.  
- Anh em cẩn thận trước khi gửi thông tin!`, { parse_mode: 'Markdown' });
                break;
            case '➕ Thêm Acc 8K':
                userStates[chatId] = 'awaiting_8k';
                bot.sendMessage(chatId, `Tài khoản 8KBET có giá trị 5000vnd/tài khoản.`);
                break;

            case '➕ Thêm Acc New88':
                userStates[chatId] = 'awaiting_new88';
                bot.sendMessage(chatId, `Tài khoản New88 có giá trị 12000vnd/tài khoản .`);
                break;
            case '➕ Thêm Acc F8':
                userStates[chatId] = 'awaiting_f8';
                bot.sendMessage(chatId, `Tài khoản F8 có giá trị 10000vnd/tài khoản .`);
                break;

            case '➕ Thêm Acc SHBet':
                userStates[chatId] = 'awaiting_sh';
                bot.sendMessage(chatId, `Tài khoản SHBET có giá trị 7000vnd/tài khoản .`);
                break;


            case '➕ Thêm Acc F168':
                userStates[chatId] = 'awaiting_f168';
                bot.sendMessage(chatId, `Tài khoản F168 có giá trị 10000vnd/tài khoản. Mỗi dòng là mỗi tài khoản.`)
                break;

            case '➕ Thêm Acc MB66':
                userStates[chatId] = 'awaiting_mb66';
                bot.sendMessage(chatId, `Tài khoản MB66 có giá trị 10000vnd/tài khoản. Mỗi dòng là mỗi tài khoản.`)
                break;


            default:

                const state = userStates[chatId];
                // console.log(chatId)




                // Thêm J88
                if (state === 'awaiting_j88' && text) {
                    const lines = text.trim().split(/[\s]+/);
                    const filePath = path.join(__dirname, 'config', 'j88.txt');
                    const balancePath = path.join(__dirname, 'database', 'balances.json');

                    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
                    const balanceData = fs.existsSync(balancePath) ? JSON.parse(fs.readFileSync(balancePath)) : {};
                    const userBalance = balanceData[username] || 0;

                    let added = 0, duplicated = 0;
                    const entries = [];

                    for (let line of lines) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length !== 2) continue;
                        const acc = parts[0];
                        const bank4 = parts[1];
                        const entry = `${acc} ${bank4} ${username}`;
                        if (!current.includes(entry)) {
                            entries.push(entry);
                        } else {
                            duplicated++;
                        }
                    }

                    const cost = entries.length * 6000;
                    if (userBalance < cost) {
                        bot.sendMessage(chatId, `⚠️ Số dư không đủ. Bạn cần ${cost.toLocaleString()}đ để thêm ${entries.length} acc.`);
                        delete userStates[chatId];
                        return;
                    }


                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.length > 0 && !content.endsWith('\n')) {
                            fs.appendFileSync(filePath, '\n');
                        }
                    }
                    for (const entry of entries) {
                        fs.appendFileSync(filePath, entry + '\n');
                        added++;
                    }

                    // Trừ tiền
                    balanceData[username] = userBalance - cost;
                    fs.writeFileSync(balancePath, JSON.stringify(balanceData, null, 2));

                    bot.sendMessage(chatId, `✅ Đã thêm ${added} acc J88.\n\n⚠️ ${duplicated} acc bị trùng.\n\n💰 Số dư còn lại: ${balanceData[username].toLocaleString()}đ`);
                    delete userStates[chatId];
                    return;
                }



                // Thêm 8K
                if (state === 'awaiting_8k' && text) {
                    const lines = text.trim().split(/[\s]+/);
                    const filePath = path.join(__dirname, 'config', '8k.txt');
                    const balancePath = path.join(__dirname, 'database', 'balances.json');

                    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
                    const balanceData = fs.existsSync(balancePath) ? JSON.parse(fs.readFileSync(balancePath)) : {};
                    const userBalance = balanceData[username] || 0;

                    let added = 0, duplicated = 0;
                    const entries = [];

                    for (let line of lines) {
                        const acc = line.trim();
                        if (!acc) continue;
                        const entry = `${acc} ${username}`;
                        if (!current.includes(entry)) {
                            entries.push(entry);
                        } else {
                            duplicated++;
                        }
                    }

                    const cost = entries.length * fee["8k.txt"];
                    if (userBalance < cost) {
                        bot.sendMessage(chatId, `⚠️ Số dư không đủ. Bạn cần ${cost.toLocaleString()}đ để thêm ${entries.length} acc.`);
                        delete userStates[chatId];
                        return;
                    }
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.length > 0 && !content.endsWith('\n')) {
                            fs.appendFileSync(filePath, '\n');
                        }
                    }
                    for (const entry of entries) {
                        fs.appendFileSync(filePath, entry + '\n');
                        added++;
                    }

                    // Trừ tiền
                    balanceData[username] = userBalance - cost;
                    fs.writeFileSync(balancePath, JSON.stringify(balanceData, null, 2));

                    bot.sendMessage(chatId, `✅ Đã thêm ${added} acc 8K.\n\n⚠️ ${duplicated} acc bị trùng.\n\n💰 Số dư còn lại: ${balanceData[username].toLocaleString()}đ`);
                    delete userStates[chatId];
                    return;
                }

                // Thêm New88
                if (state === 'awaiting_new88' && text) {
                    const lines = text.trim().split(/[\s]+/);
                    const filePath = path.join(__dirname, 'config', 'new88.txt');
                    const balancePath = path.join(__dirname, 'database', 'balances.json');

                    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
                    const balanceData = fs.existsSync(balancePath) ? JSON.parse(fs.readFileSync(balancePath)) : {};
                    const userBalance = balanceData[username] || 0;

                    let added = 0, duplicated = 0;
                    const entries = [];

                    for (let line of lines) {
                        const acc = line.trim();
                        if (!acc) continue;
                        const entry = `${acc} ${username}`;
                        if (!current.includes(entry)) {
                            entries.push(entry);
                        } else {
                            duplicated++;
                        }
                    }

                    const cost = entries.length * fee["new88.txt"];
                    if (userBalance < cost) {
                        bot.sendMessage(chatId, `⚠️ Số dư không đủ. Bạn cần ${cost.toLocaleString()}đ để thêm ${entries.length} acc.`);
                        delete userStates[chatId];
                        return;
                    }
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.length > 0 && !content.endsWith('\n')) {
                            fs.appendFileSync(filePath, '\n');
                        }
                    }
                    for (const entry of entries) {
                        fs.appendFileSync(filePath, entry + '\n');
                        added++;
                    }

                    // Trừ tiền
                    balanceData[username] = userBalance - cost;
                    fs.writeFileSync(balancePath, JSON.stringify(balanceData, null, 2));

                    bot.sendMessage(chatId, `✅ Đã thêm ${added} acc New88.\n\n⚠️ ${duplicated} acc bị trùng.\n\n💰 Số dư còn lại: ${balanceData[username].toLocaleString()}đ`);
                    delete userStates[chatId];
                    return;
                }


                // Thêm New88
                if (state === 'awaiting_f8' && text) {
                    const lines = text.trim().split(/[\s]+/);
                    const filePath = path.join(__dirname, 'config', 'f8.txt');
                    const balancePath = path.join(__dirname, 'database', 'balances.json');

                    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
                    const balanceData = fs.existsSync(balancePath) ? JSON.parse(fs.readFileSync(balancePath)) : {};
                    const userBalance = balanceData[username] || 0;

                    let added = 0, duplicated = 0;
                    const entries = [];

                    for (let line of lines) {
                        const acc = line.trim();
                        if (!acc) continue;
                        const entry = `${acc} ${username}`;
                        if (!current.includes(entry)) {
                            entries.push(entry);
                        } else {
                            duplicated++;
                        }
                    }

                    const cost = entries.length * fee["f8.txt"];
                    if (userBalance < cost) {
                        bot.sendMessage(chatId, `⚠️ Số dư không đủ. Bạn cần ${cost.toLocaleString()}đ để thêm ${entries.length} acc.`);
                        delete userStates[chatId];
                        return;
                    }


                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.length > 0 && !content.endsWith('\n')) {
                            fs.appendFileSync(filePath, '\n');
                        }
                    }
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.length > 0 && !content.endsWith('\n')) {
                            fs.appendFileSync(filePath, '\n');
                        }
                    }
                    for (const entry of entries) {
                        fs.appendFileSync(filePath, entry + '\n');
                        added++;
                    }

                    // Trừ tiền
                    balanceData[username] = userBalance - cost;
                    fs.writeFileSync(balancePath, JSON.stringify(balanceData, null, 2));

                    bot.sendMessage(chatId, `✅ Đã thêm ${added} acc F8.\n\n⚠️ ${duplicated} acc bị trùng.\n\n💰 Số dư còn lại: ${balanceData[username].toLocaleString()}đ`);
                    delete userStates[chatId];
                    return;
                }


                if (state === 'awaiting_sh' && text) {
                    const lines = text.trim().split(/[\s]+/);
                    const filePath = path.join(__dirname, 'config', 'sh.txt');
                    const balancePath = path.join(__dirname, 'database', 'balances.json');

                    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
                    const balanceData = fs.existsSync(balancePath) ? JSON.parse(fs.readFileSync(balancePath)) : {};
                    const userBalance = balanceData[username] || 0;

                    let added = 0, duplicated = 0;
                    const entries = [];

                    for (let line of lines) {
                        const acc = line.trim();
                        if (!acc) continue;
                        const entry = `${acc} ${username}`;
                        if (!current.includes(entry)) {
                            entries.push(entry);
                        } else {
                            duplicated++;
                        }
                    }

                    const cost = entries.length * fee["sh.txt"];
                    if (userBalance < cost) {
                        bot.sendMessage(chatId, `⚠️ Số dư không đủ. Bạn cần ${cost.toLocaleString()}đ để thêm ${entries.length} acc.`);
                        delete userStates[chatId];
                        return;
                    }
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.length > 0 && !content.endsWith('\n')) {
                            fs.appendFileSync(filePath, '\n');
                        }
                    }
                    for (const entry of entries) {
                        fs.appendFileSync(filePath, entry + '\n');
                        added++;
                    }

                    // Trừ tiền
                    balanceData[username] = userBalance - cost;
                    fs.writeFileSync(balancePath, JSON.stringify(balanceData, null, 2));

                    bot.sendMessage(chatId, `✅ Đã thêm ${added} acc SHBet.\n\n⚠️ ${duplicated} acc bị trùng.\n\n💰 Số dư còn lại: ${balanceData[username].toLocaleString()}đ`);
                    delete userStates[chatId];
                    return;
                }


                if (state === 'awaiting_f168' && text) {
                    const lines = text.trim().split(/[\s]+/);
                    const filePath = path.join(__dirname, 'config', 'f168.txt');
                    const balancePath = path.join(__dirname, 'database', 'balances.json');

                    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
                    const balanceData = fs.existsSync(balancePath) ? JSON.parse(fs.readFileSync(balancePath)) : {};
                    const userBalance = balanceData[username] || 0;

                    let added = 0, duplicated = 0;
                    const entries = [];

                    for (let line of lines) {
                        const acc = line.trim();
                        if (!acc) continue;
                        const entry = `${acc} ${username}`;
                        if (!current.includes(entry)) {
                            entries.push(entry);
                        } else {
                            duplicated++;
                        }
                    }

                    const cost = entries.length * fee["f168.txt"];
                    if (userBalance < cost) {
                        bot.sendMessage(chatId, `⚠️ Số dư không đủ. Bạn cần ${cost.toLocaleString()}đ để thêm ${entries.length} acc.`);
                        delete userStates[chatId];
                        return;
                    }
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.length > 0 && !content.endsWith('\n')) {
                            fs.appendFileSync(filePath, '\n');
                        }
                    }
                    for (const entry of entries) {
                        fs.appendFileSync(filePath, entry + '\n');
                        added++;
                    }

                    // Trừ tiền
                    balanceData[username] = userBalance - cost;
                    fs.writeFileSync(balancePath, JSON.stringify(balanceData, null, 2));

                    bot.sendMessage(chatId, `✅ Đã thêm ${added} acc F168.\n\n⚠️ ${duplicated} acc bị trùng.\n\n💰 Số dư còn lại: ${balanceData[username].toLocaleString()}đ`);
                    delete userStates[chatId];
                    return;
                }


                if (state === 'awaiting_mb66' && text) {
                    const lines = text.trim().split(/[\s]+/);
                    const filePath = path.join(__dirname, 'config', 'mb66.txt');
                    const balancePath = path.join(__dirname, 'database', 'balances.json');

                    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
                    const balanceData = fs.existsSync(balancePath) ? JSON.parse(fs.readFileSync(balancePath)) : {};
                    const userBalance = balanceData[username] || 0;

                    let added = 0, duplicated = 0;
                    const entries = [];

                    for (let line of lines) {
                        const acc = line.trim();
                        if (!acc) continue;
                        const entry = `${acc} ${username}`;
                        if (!current.includes(entry)) {
                            entries.push(entry);
                        } else {
                            duplicated++;
                        }
                    }

                    const cost = entries.length * fee["mb66.txt"];
                    if (userBalance < cost) {
                        bot.sendMessage(chatId, `⚠️ Số dư không đủ. Bạn cần ${cost.toLocaleString()}đ để thêm ${entries.length} acc.`);
                        delete userStates[chatId];
                        return;
                    }
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.length > 0 && !content.endsWith('\n')) {
                            fs.appendFileSync(filePath, '\n');
                        }
                    }
                    for (const entry of entries) {
                        fs.appendFileSync(filePath, entry + '\n');
                        added++;
                    }

                    // Trừ tiền
                    balanceData[username] = userBalance - cost;
                    fs.writeFileSync(balancePath, JSON.stringify(balanceData, null, 2));

                    bot.sendMessage(chatId, `✅ Đã thêm ${added} acc MB66.\n\n⚠️ ${duplicated} acc bị trùng.\n\n💰 Số dư còn lại: ${balanceData[username].toLocaleString()}đ`);
                    delete userStates[chatId];
                    return;
                }



                if (text !== '/start') showMenu(chatId);
        }
    });

}

main()
