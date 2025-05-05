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
    'sh.txt': 7000
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
        const text = msg.text ?? '';
        const username = msg.from.username?.toLowerCase();


        if (!username) {
            return bot.sendMessage(chatId, 'Bạn cần đặt username Telegram để sử dụng bot.');
        }


        // xử lý hoàn tiền
        const refundMatch = text.match(/^\/hoantien\s+(j88|8k|new88|f8)\s+(\S+)/i);

        if (refundMatch) {
            const loai = refundMatch[1].toLowerCase();
            const acc = refundMatch[2];
            const userId = username;
            const feeMap = fee;

            const filePath = path.join(__dirname, 'config', `${loai}.txt`);
            if (!fs.existsSync(filePath)) {
                return bot.sendMessage(chatId, `❌ Không tìm thấy danh sách ${loai}`);
            }

            const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
            const targetLine = lines.find(line => line.includes(acc) && line.includes(userId));

            if (!targetLine) {
                return bot.sendMessage(chatId, `⚠️ Không tìm thấy acc "${acc}" của bạn trong danh sách ${loai}.`);
            }

            // Trả lại 70% phí
            const refundAmount = Math.floor(feeMap[loai + ".txt"] * 0.7);

            // Cập nhật số dư
            const balancesPath = path.join(__dirname, 'database', 'balances.json');
            const balances = fs.existsSync(balancesPath) ? JSON.parse(fs.readFileSync(balancesPath)) : {};
            balances[userId] = (balances[userId] || 0) + refundAmount;
            fs.writeFileSync(balancesPath, JSON.stringify(balances, null, 2));

            // Xóa khỏi file
            const newLines = lines.filter(line => line !== targetLine);
            fs.writeFileSync(filePath, newLines.join('\n'));

            bot.sendMessage(chatId, `✅ Đã hoàn lại ${refundAmount.toLocaleString()}đ cho acc <b>${acc}</b> (${loai})\n\n💰 Số dư mới của bạn sẽ được cập nhật muộn nhất sau 30 giây.`, { parse_mode: 'HTML' });
            return;
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
                const files = ['j88.txt', '8k.txt', 'new88.txt', 'f8.txt'];

                let response = `🔁 Các tài khoản bạn đã thêm:\n\n`;
                let found = false;

                files.forEach(file => {
                    const filePath = path.join(configPath, file);
                    if (!fs.existsSync(filePath)) return;

                    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
                    const userLines = lines.filter(line => line.includes(userId));

                    if (userLines.length > 0) {
                        found = true;
                        const type = file.replace('.txt', '');
                        response += `📂 <b>${type.toUpperCase()}</b>\n`;
                        userLines.forEach(line => {
                            response += `— ${line}\n`;
                        });
                        response += `📥 Hoàn tiền lệnh: <code>/hoantien ${type} account_name</code>\n\n`;
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
                bot.sendMessage(chatId, `Tài khoản 8KBET có giá trị 5000vnd/tài khoản.

📍Hướng dẫn note danh sách tài khoản . (có thể note 1 lần nhiều tk )

account1
account2

❗️Lưu ý và cách kiểm tra tài khoản có đủ điều kiện để nhận thưởng hay không : 


📍NHẬP TÊN TÀI KHOẢN CÓ HIỆN NỘI DUNG SAU LÀ NHẬN ĐƯỢC :

- Số tiền nạp không đạt.

- Kiểm tra thất bại , Duy trì nạp tiền và đặt cược bình thường để có thể nhận thưởng 
 (nếu ko nhận được thì nạp tổi thiểu 10k, 11h trưa là nhận được code )

-Tài khoản mới tạo yêu cầu nạp tổi thiểu 10k qua 11h trưa mới nhận được nha .

📍NHẬP TÊN TÀI KHOẢN CÓ HIỆN NỘI DUNG SAU LÀ KHÔNG NHẬN ĐC: 

-Nhận thưởng không thành công, tài khoản của bạn không đủ điều kiện nhận thưởng.

-TK ko tồn tại.

❗️Lưu ý :BOT SẼ KHÔNG HOÀN LẠI TIỀN KHI GẶP CÁC TRƯỜNG HỢP SAU :

-TK ko tồn tại .

-Note sai tên tài khoản .

-Nhận thưởng không thành công, tài khoản của bạn không đủ điều kiện nhận thưởng.

-📍Link check lạm dụng : https://google8ksp50k.vip/
`);
                break;

            case '➕ Thêm Acc New88':
                userStates[chatId] = 'awaiting_new88';
                bot.sendMessage(chatId, `Tài khoản New88 có giá trị 12000vnd/tài khoản .

📍Hướng dẫn cách note tài khoản : (có thể note 1 lần nhiều tài khoản )

account1
account2

❗️Lưu ý và điều kiện để nhận code cho mỗi tài khoản : 

- Tài khoản phải có phát sinh giao dịch nạp gần đây .

- Ưu tiên những tk có giao dịch nạp rút .

📍 TÀI KHOẢN KHÔNG NHẬN ĐƯỢC CODE : 

- tk lâu ko nạp 


-lạm dụng ( tài khoản k đủ điều kiện để nhận thưởng )

📍Link check lạm dụng : https://khuyenmai-new88okvip1.pages.dev/?promo_id=MM88

❗️Lưu ý : 

- Bot sẽ không hoàn tiền cho tk nhập sai và bị lạm dụng .

-Tài khoản mới và sau khi có giao dịch nạp thì sau 1-2 tiếng thì mới nhận đc code .



`);
                break;
            case '➕ Thêm Acc F8':
                userStates[chatId] = 'awaiting_f8';
                bot.sendMessage(chatId, `Tài khoản F8 có giá trị 10000vnd/tài khoản .

📍Hướng dẫn cách note tài khoản : (có thể note 1 lần nhiều tài khoản )

account1
account2

❗️Lưu ý và điều kiện để nhận code cho mỗi tài khoản : 

- Tài khoản phải có phát sinh giao dịch nạp gần đây .

- Ưu tiên những tk có giao dịch nạp rút .

📍 TÀI KHOẢN KHÔNG NHẬN ĐƯỢC CODE : 

-ko đủ đkien ( trường hợp này các bạn dùng hoàn tiền 70% để hoàn tiền )

-lạm dụng ( tài khoản k đủ điều kiện để nhận thưởng )

📍Link check lạm dụng : https://ttkm-f8bet02.pages.dev/?promo_id=NH03

❗️Lưu ý : 

- Bot sẽ không hoàn tiền cho tk nhập sai và bị lạm dụng .

-Tài khoản mới và sau khi có giao dịch nạp thì sau 1-2 tiếng thì mới nhận đc code .



*Nếu có gì sai sót xin vui lòng liên hệ mình để góp ý thêm .`);
                break;

            case '➕ Thêm Acc SHBet':
                userStates[chatId] = 'awaiting_sh';
                bot.sendMessage(chatId, `Tài khoản SHBET có giá trị 7000vnd/tài khoản .

📍Hướng dẫn cách note tài khoản : (có thể note 1 lần nhiều tài khoản )

account1
account2

❗️Lưu ý và điều kiện để nhận code cho mỗi tài khoản : 

- Tài khoản phải có phát sinh giao dịch nạp gần đây .

- Ưu tiên những tk có giao dịch nạp rút .

📍 TÀI KHOẢN KHÔNG NHẬN ĐƯỢC CODE : 

- tk lâu ko nạp r (trường hợp này mình sẽ không delete tài khoản ra khỏi note , sau 12h các bạn không nạp tiền vào tk hoặc là ko hoàn tiền thì Bot xóa khỏi note và k hoàn tiền )

-ko đủ đkien ( trường hợp này các bạn dùng hoàn tiền 70% để hoàn tiền )

-lạm dụng ( tài khoản k đủ điều kiện để nhận thưởng )

📍Link check lạm dụng : https://khuyenmai-shbet01.pages.dev/?promo_id=SL01

❗️Lưu ý : 

- Bot sẽ không hoàn tiền cho tk nhập sai và bị lạm dụng .

-Tài khoản mới và sau khi có giao dịch nạp thì sau 1-2 tiếng thì mới nhận đc code .

-1 người dùng tốt nhất chỉ sử dụng 2 đến 3 tài khoản k nên quá nhìu.( trường hợp muốn nhận nhiều tk vui lòng liên hệ mình để biết thêm thông tin chi tiết.)

*Nếu có gì sai sót xin vui lòng liên hệ mình để góp ý thêm.`);
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



                if (text !== '/start') showMenu(chatId);
        }
    });

}

main()
