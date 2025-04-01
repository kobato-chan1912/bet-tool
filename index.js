const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const chalk = require('chalk')
const helper = require("./helpers/helper.js")
const EightK = require("./modules/8k.js")
const J88 = require("./modules/J88.js")
const new88 = require("./modules/new88.js")
const f8 = require("./modules/f8.js")
const { Api } = require('telegram/tl/');

// data input
const hi88IDs = ["2321421266", "2018121888", "1628875713"]
const q88IDS = ['2446066378', '2272716520', '2421765170']
const f88IDS = ['2321837001']
const new88IDS = ['2332416396', '2305004138', '2420370864', '2300154005']

const EightKIDS = ['2482026491']
const J88IDS = ['1610937400']
// const J88IDS = ['2673391905']

const SHBets = ['2256674249', '2473867941']

const testGroup = ["2673391905"]

// test group: 2673391905 

// Hàm đọc config từ file dạng key=value


const sleep = ms => new Promise(res => setTimeout(res, ms));







(async () => {
  // Đọc config từ file
  const config = await helper.loadConfig();

  // Lấy API_ID và API_HASH từ config, nếu không có thì dùng mặc định
  const apiId = parseInt(config.API_ID);
  const apiHash = config.API_HASH;

  let stringSession;

  if (apiId == null || apiHash == null) {
    console.log(chalk.redBright('\n❌ Vui lòng cấu hình API_ID và API_HASH trước khi chạy!'));
    return;
  }

  // Kiểm tra trường SESSION trong config
  if (!config.SESSION || config.SESSION === null) {
    // Nếu không có SESSION, yêu cầu đăng nhập
    stringSession = new StringSession('');
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: async () => await input.text('Nhập số điện thoại (+84xxxx): '),
      password: async () => await input.text('Nhập mật khẩu (nếu có): '),
      phoneCode: async () => await input.text('Nhập mã xác nhận (mở app telegram): '),
      onError: (err) => console.log('Lỗi:', err),
    });


    console.log(chalk.greenBright('\n✅ Kết nối Telegram thành công!'));

    // Lưu session vào config
    config.SESSION = client.session.save();
    await helper.saveConfig(config);

  } else {
    // Nếu đã có SESSION, sử dụng nó
    stringSession = new StringSession(config.SESSION);
  }

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log(chalk.greenBright('\n✅ Đang kết nối ... '));
  await sleep(10000)
  console.log(chalk.greenBright('\n✅ Bắt đầu nhận tin nhắn!'));

  // Lắng nghe tin nhắn mới từ channel
  client.addEventHandler(async (update) => {
    if (update.className === 'UpdateNewChannelMessage') {

      const message = update.message;
      const sendID = message.peerId.channelId.toString();

      if (testGroup.includes(sendID)) {
        console.log(chalk.greenBright(`\n📥 Test GROUP ${sendID}`));
        console.log(chalk.white(`\n${message}`));

        // await f8.processF8(message, client)

      }

      if (EightKIDS.includes(sendID)) { // CODE may mắn


        await EightK.process8K(message, client)

      }

      if (J88IDS.includes(sendID)) { // CODE may mắn

        // 
        await J88.processJ88(message)

      }


      if (new88IDS.includes(sendID)) { // CODE may mắn

        // 
        await new88.processNew88(message)

      }


      if (f88IDS.includes(sendID))
      {
        await f8.processF8(message, client)
      }



    }
  });

  // Giữ chương trình chạy để lắng nghe
  await new Promise(() => { });
})();