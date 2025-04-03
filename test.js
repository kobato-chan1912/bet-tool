const axios = require('axios');
const helper = require("./helpers/helper.js")
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');


async function main() {

    let success = [];
    success.push({
        user: "ko1",
        msg: 34
    })
    success.push({
        user: "ko2",
        msg: 56
    })

    for (const ele of success) {
        await helper.processDoneUser("./config/test.txt", "./output/test-done.txt", ele.user, ele.msg, 0);
    }

}
main()