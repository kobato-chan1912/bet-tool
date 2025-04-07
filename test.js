const axios = require('axios');
const helper = require("./helpers/helper.js")
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const cheerio = require('cheerio');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs')

const API_KEY = ""



async function convertSvgBase64ToPngAndReadBase64(svgBase64Full) {
    const base64Data = svgBase64Full.replace(/^data:image\/svg\+xml;base64,/, '');

    const randomId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    // Tạo đường dẫn file tạm
    const tempSvgPath = path.join(__dirname, `temp-${randomId}.svg`);
    const tempPngPath = path.join(__dirname, `temp-${randomId}.png`);

    // Ghi SVG ra file
    fs.writeFileSync(tempSvgPath, Buffer.from(base64Data, 'base64'));

    // Đọc nội dung SVG từ file
    let svgContent = fs.readFileSync(tempSvgPath, 'utf-8');

    // Sử dụng cheerio để chỉnh sửa nội dung SVG
    const $ = cheerio.load(svgContent, { xmlMode: true });

    // Thay đổi tất cả các chữ màu trắng thành màu đen
    $('text').each((i, elem) => {
        const currentColor = $(elem).attr('fill');
        if (currentColor === 'white' || currentColor === '#ffffff') {
            $(elem).attr('fill', 'black');
        }
    });

    // Lưu lại SVG đã chỉnh sửa
    const modifiedSvgContent = $.html();
    fs.writeFileSync(tempSvgPath, modifiedSvgContent);

    // Dùng sharp chuyển sang PNG
    await sharp(tempSvgPath)
        .resize(500, 200, {
            fit: 'cover', // Bao quanh hết khung (có thể bị cắt xén)
            background: '#ffffff' // Nền trắng nếu cần thiết
        })
        .flatten({ background: '#ffffff' }) // Đảm bảo nền trắng nếu SVG trong suốt
        .png()
        .toFile(tempPngPath);

    // Đọc PNG và chuyển sang base64
    const pngBuffer = fs.readFileSync(tempPngPath);
    const pngBase64 = pngBuffer.toString('base64');

    // Xóa file tạm
    fs.unlinkSync(tempSvgPath);
    // fs.unlinkSync(tempPngPath);

    return pngBase64;
}





async function createCaptchaTask(base64Image) {
    const payload = {
        clientKey: API_KEY,
        task: {
            type: 'ImageToTextTask',
            image: base64Image,
            subType: 'common',
        },
    };

    try {
        const response = await axios.post('http://api.achicaptcha.com/createTask', payload);
        if (response.data.errorId === 0) {
            console.log('Task created:', response.data.taskId);
            return response.data.taskId;
        } else {
            throw new Error(`Create task failed: ${JSON.stringify(response.data)}`);
        }
    } catch (err) {
        throw new Error(`Error creating task: ${err.message}`);
    }
}

// Lấy kết quả task
async function getTaskResult(taskId) {
    const payload = {
        clientKey: API_KEY,
        taskId: taskId,
    };

    try {
        const response = await axios.post('http://api.achicaptcha.com/getTaskResult', payload);
        return response.data;
    } catch (err) {
        throw new Error(`Error getting task result: ${err.message}`);
    }
}

// Xử lý toàn bộ flow
async function solveCaptcha(svgB64) {
    try {
        const pngB64 = await convertSvgBase64ToPngAndReadBase64(svgB64);
        const taskId = await createCaptchaTask(pngB64);
        // Đợi và kiểm tra kết quả
        const pollInterval = 100;
        const maxAttemp = 10;
        let attemp = 0;
        while (true && attemp <= maxAttemp) {
            console.log('Checking result...');
            const result = await getTaskResult(taskId);
            if (result.status === 'ready') {
                console.log('Captcha solved:', result.solution);
                break;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attemp++;

        }
    } catch (err) {
        console.error('Solve failed:', err.message);
    }
}


async function modifySvgBase64AndReturnPngBase64(svgBase64Full) {
    // Giải mã base64 thành chuỗi SVG
    const base64Data = svgBase64Full.replace(/^data:image\/svg\+xml;base64,/, '');
    const svgContent = Buffer.from(base64Data, 'base64').toString('utf-8');

    // Sử dụng cheerio để phân tích và chỉnh sửa SVG
    const $ = cheerio.load(svgContent, { xmlMode: true });

    // Lặp qua tất cả các path và thực hiện yêu cầu:
    $('path').each((i, elem) => {
        // Xóa path có fill="none"
        if ($(elem).attr('fill') === 'none') {
            $(elem).remove();
        } else {
            // Thêm stroke="black" cho các path còn lại
            $(elem).attr('stroke', 'black');
        }
    });

    // Lấy lại nội dung SVG đã chỉnh sửa
    const modifiedSvgContent = $.html();

    // Tạo một tệp tạm để lưu SVG đã chỉnh sửa
    const randomId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    // Tạo đường dẫn file tạm
    const tempSvgPath = path.join(__dirname, `temp-${randomId}.svg`);
    const tempPngPath = path.join(__dirname, `temp-${randomId}.png`);


    // Ghi nội dung SVG đã chỉnh sửa vào file
    fs.writeFileSync(tempSvgPath, modifiedSvgContent);

    // Sử dụng sharp để chuyển SVG thành PNG
    await sharp(tempSvgPath)
        .resize(298, 98, {
            fit: 'cover', // Giữ tỉ lệ trong khung
            background: '#ffffff' // Nền trắng
        })
        .flatten({ background: '#ffffff' }) // Đảm bảo nền trắng nếu SVG trong suốt
        .png()
        .toFile(tempPngPath);

    // Đọc file PNG và chuyển thành base64
    const pngBuffer = fs.readFileSync(tempPngPath);
    const pngBase64 = pngBuffer.toString('base64');

    // Xóa file tạm
    fs.unlinkSync(tempSvgPath);
    fs.unlinkSync(tempPngPath);




    // Trả về base64 của ảnh PNG
    let b64png =  `data:image/png;base64,${pngBase64}`;
    return b64png
}

