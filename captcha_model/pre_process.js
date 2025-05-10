async function modifySvgBase64AndReturnPngBase64(svgBase64Full) {
  // Giải mã base64 thành chuỗi SVG
  const base64Data = svgBase64Full.replace(/^data:image\/svg\+xml;base64,/, '');
  const svgContent = Buffer.from(base64Data, 'base64').toString('utf-8');

  // Sử dụng cheerio để phân tích và chỉnh sửa SVG
  const $ = cheerio.load(svgContent, { xmlMode: true });

  // Lưu thông tin về các path và giá trị x nhỏ nhất để sắp xếp
  const paths = [];
  $('path').each((i, elem) => {
    if ($(elem).attr('fill') === 'none') {
      $(elem).remove();
      return;
    }

    const d = $(elem).attr('d');
    const coords = d.match(/[MLCQ]\s*([-+]?\d*\.?\d+)\s*[, ]\s*([-+]?\d*\.?\d+)/g) || [];
    let minX = Infinity;

    coords.forEach(coord => {
      const x = parseFloat(coord.match(/[-+]?\d*\.?\d+(?=\s*[, ])/)[0]);
      if (x < minX) minX = x;
    });

    if (minX === Infinity) minX = 0;

    paths.push({ index: i, minX, elem });
  });

  // Sắp xếp các path theo giá trị x nhỏ nhất (từ trái sang phải)
  paths.sort((a, b) => a.minX - b.minX);

  // Dịch chuyển các path với khoảng cách 100 đơn vị
  paths.forEach((pathInfo, newIndex) => {
    const elem = pathInfo.elem; // Truy cập elem từ pathInfo
    let d = $(elem).attr('d');

    // Thêm stroke="black"
    $(elem).attr('stroke', 'black');

    // Tính offset: path đầu tiên giữ nguyên (offset = 0), các path sau cách nhau 100 đơn vị
    const offset = newIndex * 30;

    // Dịch chuyển tất cả các tọa độ x trong d
    let modifiedD = d;

    // Biểu thức chính quy để bắt tất cả các cặp tọa độ x, y
    modifiedD = modifiedD.replace(
      /([MLCQ])\s*([-+]?\d*\.?\d+)\s*[, ]\s*([-+]?\d*\.?\d+)/g,
      (match, cmd, x, y) => {
        const newX = parseFloat(x) + offset;
        return `${cmd} ${newX.toFixed(2)} ${y}`;
      }
    );

    // Xử lý riêng cho Q và C vì chúng có nhiều cặp tọa độ hơn
    // Lặp lại để cập nhật các tọa độ tiếp theo trong Q (x2 y2)
    modifiedD = modifiedD.replace(
      /(Q\s*[-+]?\d*\.?\d+\s*[-+]?\d*\.?\d+)\s*([-+]?\d*\.?\d+)\s*[, ]\s*([-+]?\d*\.?\d+)/g,
      (match, prefix, x2, y2) => {
        const newX2 = parseFloat(x2) + offset;
        return `${prefix} ${newX2.toFixed(2)} ${y2}`;
      }
    );

    // Cập nhật thuộc tính d với giá trị đã dịch chuyển
    $(elem).attr('d', modifiedD);
  });

  // Cập nhật kích thước SVG để chứa tất cả các path sau khi dịch chuyển
  const totalWidth = 300; // 140 là chiều rộng ban đầu
  $('svg').attr('width', totalWidth);
  $('svg').attr('viewBox', `0,0,${totalWidth},56`);

  // Lấy lại nội dung SVG đã chỉnh sửa
  const modifiedSvgContent = $.html();

  // Tạo một tệp tạm để lưu SVG đã chỉnh sửa
  const randomId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const tempSvgPath = path.join(__dirname, `captchas/temp/temp-${randomId}.svg`);
  const tempPngPath = path.join(__dirname, `captchas/temp/temp-${randomId}.png`);

  // Ghi nội dung SVG đã chỉnh sửa vào file
  await fs.writeFile(tempSvgPath, modifiedSvgContent);

  // Sử dụng sharp để chuyển SVG thành PNG
  await sharp(tempSvgPath)
    .resize(totalWidth, 98, {
      fit: 'outside', // Đảm bảo toàn bộ nội dung được hiển thị
      background: '#ffffff'
    })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(tempPngPath);

  // Đọc file PNG và chuyển thành base64
  const pngBuffer = await fs.readFile(tempPngPath);
  const pngBase64 = pngBuffer.toString('base64');

  // Xóa file tạm
  await fs.unlink(tempSvgPath);
  await fs.unlink(tempPngPath);

  // Trả về base64 của ảnh PNG
  return `data:image/png;base64,${pngBase64}`;
}