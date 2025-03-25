const axios = require('axios');

const proxyText = "49431527-zone-custom-region-VN-sessid-cvY2ajei-sessTime-120:VFck7dfB@as.proxys5.net:6200";

// Tách username:password và host:port
const [authPart, hostPort] = proxyText.split('@');
const [username, password] = authPart.split(':');
const [host, port] = hostPort.split(':');

const proxy = {
    host,
    port: parseInt(port, 10),
    auth: { username, password }
};

const fetchIP = async () => {
    try {
        const response = await axios.get('http://httpbin.org/ip', { proxy });
        console.log(response.data);
    } catch (error) {
        console.error('Lỗi:', error.message);
    }
};

fetchIP();
