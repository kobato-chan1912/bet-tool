const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxiesFile = 'config/proxies.txt';
const urls = [
  'https://freecode-new88.pages.dev',
  'https://f8bet2b.xyz/',
  'https://freecode-shbet.pages.dev/',
  'https://f168.pro/',
  'https://codemb66.net/',
  'https://httpbin.org/ip'
];

async function testProxy(proxy, url) {
  const agent = new HttpsProxyAgent("http://" + proxy);
  const start = Date.now();

  try {
    const response = await axios.get(url, {
      httpsAgent: agent,
      timeout: 10000,
    });

    const duration = Date.now() - start;

    // Nếu là httpbin, in ra IP
    if (url.includes('httpbin.org/ip')) {
      return {
        success: true,
        time: duration,
        status: response.status,
        ip: response.data.origin || 'unknown'
      };
    }

    return {
      success: true,
      time: duration,
      status: response.status
    };
  } catch (err) {
    return {
      success: false,
      error: err.code || err.message
    };
  }
}

async function runBenchmark() {
  const proxyList = fs.readFileSync(proxiesFile, 'utf-8')
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  for (const proxy of proxyList) {
    console.log(`\n🔌 Proxy: ${proxy}`);
    for (const url of urls) {
      const result = await testProxy(proxy, url);
      if (result.success) {
        if (result.ip) {
          console.log(`✅ [${url}] - IP: ${result.ip} - Time: ${result.time} ms`);
        } else {
          console.log(`✅ [${url}] - Status: ${result.status} - Time: ${result.time} ms`);
        }
      } else {
        console.log(`❌ [${url}] - Failed: ${result.error}`);
      }
    }
  }
}

runBenchmark();
