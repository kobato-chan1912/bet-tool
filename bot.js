const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const helper = require("./helpers/helper.js")


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

    function showMenu(chatId) {
        bot.sendMessage(chatId, '️🎉 Chào mừng đến Bot Telegram', {
            reply_markup: {
                keyboard: [
                    ['Xem số dư', 'Nạp tiền'],
                    ['Thêm Acc J88', 'Thêm Acc 8K']
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
        const text = msg.text;
        const username = msg.from.username?.toLowerCase();


        if (!username) {
            return bot.sendMessage(chatId, 'Bạn cần đặt username Telegram để sử dụng bot.');
        }

        switch (text) {
            case 'Xem số dư':
                userStates[chatId] = 'info'
                // await checkAndUpdateBalance();
                const balance = balances[username] || 0;
                bot.sendMessage(chatId, `💰 *Số dư của bạn:*  ${balance.toLocaleString()}  đồng`, { parse_mode: 'Markdown' });
                break;
            case 'Nạp tiền':
                userStates[chatId] = 'deposit'
                const qrLink = `https://img.vietqr.io/image/acb-${config.BANK}-compact.jpg?addInfo=naptienbot ${username}`;
                bot.sendPhoto(chatId, qrLink, {
                    caption: `💰 Vui lòng chuyển khoản đúng nội dung:\n\n➡️ *naptienbot ${username}*\n\n📌 Hệ thống sẽ tự động cộng tiền sau vài phút.`,
                    parse_mode: 'Markdown'
                });
                break;
            case 'Thêm Acc J88':
                userStates[chatId] = 'awaiting_j88';
                bot.sendMessage(chatId, `📝 *Vui lòng gửi thông tin tài khoản J88 của bạn* theo cú pháp:
                \n\n
                \`<username> <4 số cuối ngân hàng>\`\n\n
                📌 *Ví dụ:* \`dungana 1234\`
`, { parse_mode: 'Markdown' });
                break;
            case 'Thêm Acc 8K':
                userStates[chatId] = 'awaiting_8k';
                bot.sendMessage(chatId, `📝 *Vui lòng gửi thông tin tài khoản 8K của bạn* theo cú pháp:
                \n\n
                \`<username>\`\n\n
                📌 *Ví dụ:* \`dungana\`
`, { parse_mode: 'Markdown' });
                break;
            default:

                const state = userStates[chatId];
                // console.log(chatId)

                // Thêm J88
                if (state === 'awaiting_j88') {
                    const lines = text.trim().split('\n');
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
                        const entry = `${acc} ${bank4} ${chatId}`;
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
                if (state === 'awaiting_8k') {
                    const lines = text.trim().split('\n');
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
                        const entry = `${acc} ${chatId}`;
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



                if (text !== '/start') showMenu(chatId);
        }
    });

}

main()
