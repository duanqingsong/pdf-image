#!/usr/bin/env node

const { program } = require('commander');
const { spawn } = require('child_process');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

// 配置命令行参数
program
  .name('pdf2img')
  .description('Convert PDF to a single stitched image')
  .argument('<pdf>', 'PDF file path')
  .option('-o, --output <path>', 'Output image path (default: same as PDF)')
  .option('-w, --width <number>', 'Image width in pixels', '1200')
  .option('-q, --quality <number>', 'Image quality (1-100)', '90')
  .option('-f, --format <type>', 'Output format (jpg|png|webp)', 'jpg')
  .parse();

const options = program.opts();
const pdfPath = program.args[0];

/**
 * 主函数
 */
async function main() {
  try {
    // 验证 PDF 文件存在
    if (!fs.existsSync(pdfPath)) {
      console.error(`❌ 错误: PDF 文件不存在: ${pdfPath}`);
      process.exit(1);
    }

    // 验证参数
    const width = parseInt(options.width);
    const quality = parseInt(options.quality);
    
    if (isNaN(width) || width <= 0) {
      console.error('❌ 错误: 宽度必须是正整数');
      process.exit(1);
    }
    
    if (isNaN(quality) || quality < 1 || quality > 100) {
      console.error('❌ 错误: 质量必须在 1-100 之间');
      process.exit(1);
    }

    const validFormats = ['jpg', 'jpeg', 'png', 'webp'];
    const format = options.format.toLowerCase();
    if (!validFormats.includes(format)) {
      console.error(`❌ 错误: 不支持的格式 "${format}". 支持的格式: ${validFormats.join(', ')}`);
      process.exit(1);
    }

    // 确定输出路径
    const outputPath = options.output || getDefaultOutputPath(pdfPath, format);
    
    console.log('📄 PDF 转图片工具');
    console.log('━'.repeat(50));
    console.log(`输入文件: ${pdfPath}`);
    console.log(`输出文件: ${outputPath}`);
    console.log(`图片宽度: ${width}px`);
    console.log(`图片质量: ${quality}%`);
    console.log(`输出格式: ${format.toUpperCase()}`);
    console.log('━'.repeat(50));

    // 转换 PDF
    await convertPdfToImage(pdfPath, outputPath, width, quality, format);
    
    console.log('\n✅ 转换完成!');
    console.log(`输出文件: ${outputPath}`);
    
  } catch (error) {
    throw error; // 抛出错误让外层 catch 处理
  }
}

/**
 * 获取默认输出路径
 */
function getDefaultOutputPath(pdfPath, format) {
  const dir = path.dirname(pdfPath);
  const basename = path.basename(pdfPath, path.extname(pdfPath));
  const ext = format === 'jpg' ? 'jpg' : format;
  return path.join(dir, `${basename}.${ext}`);
}

/**
 * 转换 PDF 到图片
 */
async function convertPdfToImage(pdfPath, outputPath, width, quality, format) {
  const tempDir = path.join(path.dirname(pdfPath), `.pdf2img_temp_${Date.now()}`);
  
  try {
    // 创建临时目录
    await mkdir(tempDir, { recursive: true });
    console.log('\n📝 步骤 1/3: 将 PDF 转换为图片页...');
    
    // 获取 PDF 信息
    const pdfInfo = await new Promise((resolve, reject) => {
      const proc = spawn('pdfinfo', [pdfPath]);
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => { stdout += data; });
      proc.stderr.on('data', (data) => { stderr += data; });
      
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`pdfinfo 失败: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
      
      proc.on('error', () => {
        resolve(''); // pdfinfo 不可用,继续
      });
    });
    
    // 解析页数
    let pageCount = 3; // 默认值
    const pageMatch = pdfInfo.match(/Pages:\s+(\d+)/);
    if (pageMatch) {
      pageCount = parseInt(pageMatch[1]);
      console.log(`   PDF 共 ${pageCount} 页`);
    }
    
    // 计算 DPI - 对于大尺寸 PDF 降低 DPI
    const pageSizeMatch = pdfInfo.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)/);
    let dpi = Math.round(width / 595 * 72); // 默认按 A4 计算
    
    if (pageSizeMatch) {
      const pdfWidth = parseFloat(pageSizeMatch[1]);
      if (pdfWidth > 800) {
        // 大尺寸 PDF,降低 DPI
        dpi = Math.round(width / pdfWidth * 72);
        console.log(`   检测到大尺寸 PDF (${pdfWidth.toFixed(0)}pt),调整 DPI 为 ${dpi}`);
      }
    }
    
    // 确保 DPI 不会太高
    dpi = Math.min(dpi, 200);
    console.log(`   使用 DPI: ${dpi}`);
    
    // 使用 pdftoppm 转换 PDF,逐页转换避免内存问题
    const outputPrefix = path.join(tempDir, 'page');
    
    console.log('   正在转换 PDF 页面...');
    
    for (let page = 1; page <= pageCount; page++) {
      process.stdout.write(`   [${page}/${pageCount}] `);
      
      await new Promise((resolve, reject) => {
        const args = [
          '-png',
          '-r', dpi.toString(),
          '-f', page.toString(),  // 起始页
          '-l', page.toString(),  // 结束页
          pdfPath,
          outputPrefix
        ];
        
        const proc = spawn('pdftoppm', args);
        
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
          process.stdout.write('.');
        });
        
        proc.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        proc.on('error', (error) => {
          if (error.code === 'ENOENT') {
            reject(new Error('未找到 pdftoppm 命令。请先安装 Poppler:\nmacOS: brew install poppler\nUbuntu: sudo apt-get install poppler-utils'));
          } else {
            reject(error);
          }
        });
        
        proc.on('close', (code) => {
          if (code !== 0) {
            console.log(` ✗`);
            reject(new Error(`第 ${page} 页转换失败 (退出码 ${code})${stderr ? ': ' + stderr : ''}`));
          } else {
            console.log(` ✓`);
            resolve();
          }
        });
        
        // 每页60秒超时
        setTimeout(() => {
          proc.kill();
          console.log(` ✗ (超时)`);
          reject(new Error(`第 ${page} 页转换超时`));
        }, 60000);
      });
    }
    
    // 等待文件系统同步
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 读取生成的图片
    console.log('📝 步骤 2/3: 读取并拼接页面...');
    const files = (await readdir(tempDir))
      .filter(f => f.startsWith('page') && f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0]);
        const numB = parseInt(b.match(/\d+/)[0]);
        return numA - numB;
      });

    if (files.length === 0) {
      throw new Error('PDF 转换失败,未生成任何页面');
    }

    console.log(`   成功转换 ${files.length} 页`);

    // 读取所有图片并调整宽度
    const images = [];
    for (let i = 0; i < files.length; i++) {
      const filePath = path.join(tempDir, files[i]);
      console.log(`   处理第 ${i + 1}/${files.length} 页...`);
      
      try {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        
        console.log(`      尺寸: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}`);
        
        // 如果宽度不匹配,调整大小
        let imageBuffer;
        if (metadata.width !== width) {
          const height = Math.round(metadata.height * (width / metadata.width));
          imageBuffer = await image
            .resize(width, height, {
              fit: 'fill',
              kernel: sharp.kernel.lanczos3
            })
            .png()
            .toBuffer();
        } else {
          imageBuffer = await image.png().toBuffer();
        }
        
        images.push(imageBuffer);
      } catch (error) {
        console.error(`      ⚠️  处理第 ${i + 1} 页时出错: ${error.message}`);
        // 跳过损坏的页面
        continue;
      }
    }
    
    if (images.length === 0) {
      throw new Error('所有页面处理失败');
    }

    // 拼接图片
    console.log('📝 步骤 3/3: 拼接图片并保存...');
    
    // 获取每页的高度
    const heights = await Promise.all(
      images.map(async (img) => {
        const metadata = await sharp(img).metadata();
        return metadata.height;
      })
    );
    
    const totalHeight = heights.reduce((sum, h) => sum + h, 0);
    
    // 创建空白画布
    const canvas = sharp({
      create: {
        width: width,
        height: totalHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    });

    // 准备合成操作
    const compositeOperations = [];
    let currentTop = 0;
    
    for (let i = 0; i < images.length; i++) {
      compositeOperations.push({
        input: images[i],
        top: currentTop,
        left: 0
      });
      currentTop += heights[i];
    }

    // 合成并保存
    let output = canvas.composite(compositeOperations);
    
    // 根据格式设置输出选项
    if (format === 'jpg' || format === 'jpeg') {
      output = output.jpeg({ quality });
    } else if (format === 'png') {
      output = output.png({ 
        quality,
        compressionLevel: Math.round((100 - quality) / 10)
      });
    } else if (format === 'webp') {
      output = output.webp({ quality });
    }

    await output.toFile(outputPath);

  } finally {
    // 清理临时文件
    try {
      if (fs.existsSync(tempDir)) {
        const files = await readdir(tempDir);
        for (const file of files) {
          await unlink(path.join(tempDir, file));
        }
        await rmdir(tempDir);
      }
    } catch (error) {
      console.warn(`⚠️  警告: 清理临时文件失败: ${error.message}`);
    }
  }
}

// 运行主函数
main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(`\n❌ 错误: ${error.message}`);
  process.exit(1);
});
