const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const helper = require("./helpers/helper.js")

const fee = {
    'j88.txt': 6000,
    '8k.txt': 6000,
    'new88.txt': 10000,
    'f8.txt': 12000
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
        let text = '🎉 Chào mừng đến Bot Hunter Code \n\n⏳ Mã không có sẵn – phải canh, phải săn – nhưng lời thì thật!\n\n👉 Muốn làm gì thì chọn bên dưới bạn nhé!';
        if (showText == 0){
            text = '\u2063'
        }
        bot.sendMessage(chatId, text, {
            reply_markup: {
                keyboard: [
                    ['💰 Xem số dư', '💸 Nạp tiền', '♻️ Hoàn tiền'],
                    ['➕ Thêm Acc J88', '➕ Thêm Acc 8K'],
                    ['➕ Thêm Acc New88', '➕ Thêm Acc F8']
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


        // xử lý hoàn tiền

        if (userStates[chatId]?.state === 'awaiting_refund_confirmation') {
            const { refundInfo } = userStates[chatId];
            delete userStates[chatId];

            if (text === '✅ Yes') {
                // Hoàn tiền
                const balancesPath = path.join(__dirname, 'database', 'balances.json');
                const balances = fs.existsSync(balancesPath) ? JSON.parse(fs.readFileSync(balancesPath)) : {};
                balances[username] = (balances[username] || 0) + refundInfo.amount;
                fs.writeFileSync(balancesPath, JSON.stringify(balances, null, 2));

                // Xóa khỏi file
                refundInfo.entries.forEach(({ file, line }) => {
                    const content = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim() !== line.trim());
                    fs.writeFileSync(file, content.join('\n'));
                });

                bot.sendMessage(chatId, `✅ Đã hoàn lại ${refundInfo.amount.toLocaleString()} đồng vào tài khoản của bạn. Vui lòng đợi tối đa 30 giây để được cập nhật.`);
            } else if (text === '❌ No') {
                bot.sendMessage(chatId, '🚫 Bạn đã hủy yêu cầu hoàn tiền.');
            }

            // Gửi lại menu chính nếu muốn
            showMenu(chatId, 0);
        }

        switch (text) {
            case '❌ No': 
                break;
            case '✅ Yes': 
                break;
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
                const userAccs = [];
                const userId = username; // username telegram
                const configPath = path.join(__dirname, 'config');
                const files = ['j88.txt', '8k.txt', 'new88.txt', 'f8.txt'];
                let totalRefund = 0;
                const toRemove = [];

                files.forEach(file => {
                    const filePath = path.join(configPath, file);
                    if (!fs.existsSync(filePath)) return;
                    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);

                    lines.forEach(line => {
                        if (line.includes(userId)) {
                            userAccs.push(`📌 ${line} (${file.replace('.txt', '')})`);
                            totalRefund += fee[file];
                            toRemove.push({ file: filePath, line });
                        }
                    });
                });

                if (userAccs.length === 0) {
                    bot.sendMessage(chatId, '🔍 Không tìm thấy tài khoản nào của bạn cần hoàn.');
                    return;
                }
                const finalRefund = Math.floor(totalRefund * 0.7);
                const msg = `🔁 Các tài khoản bạn đã thêm:\n${userAccs.join('\n')}\n\n💰 Hoàn lại: ${finalRefund.toLocaleString()} đồng (đã trừ 30%)\n\nBạn có muốn hoàn không?`;
                userStates[chatId] = {
                    state: 'awaiting_refund_confirmation',
                    refundInfo: {
                        entries: toRemove,
                        amount: finalRefund
                    }
                };


                bot.sendMessage(chatId, msg, {
                    reply_markup: {
                        keyboard: [[{ text: '✅ Yes' }, { text: '❌ No' }]],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });





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
                bot.sendMessage(chatId, `📝 **Gửi thông tin tài khoản 8K của bạn**

💰 6k / code

📋 **Cú pháp (mỗi hàng là một tài khoản, có thể cài nhiều tài khoản):**  

\`\`\` 
<username>
\`\`\`

✅ **Ví dụ:**

tuanlong
nguyentri


⚠️ **Lưu ý:** 

- Kiểm tra kỹ tài khoản lạm dụng trước khi gửi.  
- Gửi sai cú pháp hoặc tài khoản bị lạm dụng sẽ **không được hoàn tiền**.  
- Anh em cẩn thận trước khi gửi thông tin!`, { parse_mode: 'Markdown' });
                break;

            case '➕ Thêm Acc New88':
                userStates[chatId] = 'awaiting_new88';
                bot.sendMessage(chatId, `📝 **Gửi thông tin tài khoản New88 của bạn**

💰 10k / code

📋 **Cú pháp (mỗi hàng là một tài khoản, có thể cài nhiều tài khoản):**  
    
\`\`\` 
<username>
\`\`\`
    
✅ **Ví dụ:**
    
tuanlong
nguyentri
    
    
⚠️ **Lưu ý:** 

- Kiểm tra kỹ tài khoản lạm dụng trước khi gửi.  
- Gửi sai cú pháp hoặc tài khoản bị lạm dụng sẽ **không được hoàn tiền**.  
- Anh em cẩn thận trước khi gửi thông tin!`, { parse_mode: 'Markdown' });
                break;
            case '➕ Thêm Acc F8':
                userStates[chatId] = 'awaiting_f8';
                bot.sendMessage(chatId, `📝 **Gửi thông tin tài khoản F8 của bạn**

💰 12k / code

📋 **Cú pháp (mỗi hàng là một tài khoản, có thể cài nhiều tài khoản):**  
        
\`\`\` 
<username>
\`\`\`
        
✅ **Ví dụ:**
        
tuanlong
nguyentri
        
        
⚠️ **Lưu ý:** 
        
- Kiểm tra kỹ tài khoản lạm dụng trước khi gửi.  
- Gửi sai cú pháp hoặc tài khoản bị lạm dụng sẽ **không được hoàn tiền**.  
- Anh em cẩn thận trước khi gửi thông tin!`, { parse_mode: 'Markdown' });
                break;

            default:

                const state = userStates[chatId];
                // console.log(chatId)




                // Thêm J88
                if (state === 'awaiting_j88' && text) {
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
                        const entry = `${acc} ${username}`;
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

                // Thêm New88
                if (state === 'awaiting_new88' && text) {
                    const lines = text.trim().split('\n');
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

                    const cost = entries.length * 10000;
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

                    bot.sendMessage(chatId, `✅ Đã thêm ${added} acc New88.\n\n⚠️ ${duplicated} acc bị trùng.\n\n💰 Số dư còn lại: ${balanceData[username].toLocaleString()}đ`);
                    delete userStates[chatId];
                    return;
                }


                // Thêm New88
                if (state === 'awaiting_f8' && text) {
                    const lines = text.trim().split('\n');
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

                    const cost = entries.length * 12000;
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

                    bot.sendMessage(chatId, `✅ Đã thêm ${added} acc F8.\n\n⚠️ ${duplicated} acc bị trùng.\n\n💰 Số dư còn lại: ${balanceData[username].toLocaleString()}đ`);
                    delete userStates[chatId];
                    return;
                }



                if (text !== '/start') showMenu(chatId);
        }
    });

}

main()
