const chalk = require('chalk')
const fs = require('fs').promises;
const { RekognitionClient, DetectTextCommand }  = require("@aws-sdk/client-rekognition")


const client = new RekognitionClient({
    region: "ap-southeast-1",
    credentials: {
      accessKeyId: "",
      secretAccessKey: ""
    }
  });
  


  async function processImage(imagePath) {
    try {
      // Đọc file ảnh và chuyển thành buffer
      const imageBuffer = await fs.readFile(imagePath);
   
  
      // Gửi request đến Amazon Rekognition
      const command = new DetectTextCommand({
        Image: { Bytes: imageBuffer }
      });
  
  
      const result = await client.send(command);
  
      // Trích xuất văn bản từ response
      const codes = result.TextDetections
        .filter(d => d.Type === 'WORD')
        .map(d => d.DetectedText)
        .filter(text => /^[A-Za-z0-9]{8}$/.test(text));
  
      console.log(chalk.blue(`🔍 Code phát hiện: ${codes.join(', ')}`));
      return codes;
    } catch (error) {
      console.error(chalk.red('❌ Lỗi nhận diện hình ảnh:'), error);
      return [];
    }
  }
  
  // Gọi hàm để test
  processImage('photo_2025-03-15_22-03-11.jpg');
  

