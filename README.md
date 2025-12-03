# PDF 转图片工具

将 PDF 文件转换为单张图片,多页 PDF 会垂直拼接成一张长图。

## 功能特性

- ✅ 支持多页 PDF 垂直拼接
- ✅ 可自定义图片宽度和质量
- ✅ 支持多种输出格式 (JPG/PNG/WebP)
- ✅ 带进度提示
- ✅ 跨平台支持 (macOS/Ubuntu)

## 系统要求

此工具需要安装 Poppler 系统依赖。

### macOS

```bash
brew install poppler
```

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install poppler-utils
```

### 验证安装

```bash
pdftoppm -v
```

如果显示版本信息,说明安装成功。

## 安装

1. 克隆或下载此项目
2. 安装 Node.js 依赖:

```bash
npm install
```

## 使用方法

### 基本用法

最简单的用法,使用默认设置:

```bash
node pdf2img.js 你的文件.pdf
```

这会在 PDF 同目录下生成 `你的文件.jpg`

### 完整参数

```bash
node pdf2img.js <PDF文件路径> [选项]
```

**选项:**

- `-o, --output <路径>` - 指定输出文件路径(默认:PDF同目录同名)
- `-w, --width <数字>` - 图片宽度,单位像素(默认:1200)
- `-q, --quality <数字>` - 图片质量,1-100(默认:90)
- `-f, --format <格式>` - 输出格式:jpg/png/webp(默认:jpg)
- `-h, --help` - 显示帮助信息

### 使用示例

**1. 使用默认设置转换:**

```bash
node pdf2img.js document.pdf
```

输出: `document.jpg` (宽度1200px, 质量90%)

**2. 自定义宽度和质量:**

```bash
node pdf2img.js document.pdf --width 1600 --quality 95
```

**3. 输出为 PNG 格式:**

```bash
node pdf2img.js document.pdf --format png
```

**4. 指定输出路径:**

```bash
node pdf2img.js document.pdf --output /path/to/output.jpg
```

**5. 完整自定义:**

```bash
node pdf2img.js document.pdf -w 2000 -q 95 -f png -o result.png
```

## 参数说明

### 宽度 (--width)

- 默认值: 1200px
- 说明: A4 纸张按 150 DPI 计算约 1240px,1200px 可以清晰显示文字且文件大小适中
- 建议: 
  - 普通文档: 1200-1600px
  - 高清需求: 1600-2400px
  - 注意: 宽度越大,文件越大,处理时间越长

### 质量 (--quality)

- 默认值: 90%
- 说明: 1-100 的整数,数字越大质量越好但文件越大
- 建议:
  - JPG: 85-95 (平衡质量和文件大小)
  - PNG: 80-100 (PNG 压缩算法不同)
  - WebP: 80-90 (WebP 压缩效率更高)

### 格式 (--format)

- 默认值: jpg
- 支持格式:
  - **jpg/jpeg**: 适合照片和复杂图像,文件较小
  - **png**: 无损压缩,适合文字和图表,文件较大
  - **webp**: 现代格式,压缩效率高,兼容性略差

## 工作原理

1. 将 PDF 的每一页转换为独立的 PNG 图片
2. 调整每页图片的宽度(保持宽高比)
3. 将所有页面垂直拼接成一张长图
4. 按指定格式和质量输出最终图片
5. 自动清理临时文件

## 故障排除

### 错误: "Command failed: pdftoppm"

**原因**: 未安装 Poppler 或 Poppler 不在系统 PATH 中

**解决**: 
1. 按照上面"系统要求"部分安装 Poppler
2. 验证安装: `pdftoppm -v`
3. macOS 用户确保已运行: `brew install poppler`

### 错误: "PDF 文件不存在"

**原因**: PDF 路径错误

**解决**: 检查文件路径是否正确,可以使用绝对路径

### 内存不足

**原因**: PDF 页数太多或宽度设置太大

**解决**: 
- 减小宽度参数
- 分批处理 PDF
- 增加系统可用内存

### 生成的图片模糊

**原因**: 宽度设置太小

**解决**: 增加 `--width` 参数值,推荐 1600 或更高

## 注意事项

- 处理大型 PDF 文件可能需要较长时间和较多内存
- 转换过程中会在 PDF 同目录创建临时文件夹,完成后自动删除
- 输出文件会覆盖同名文件,请注意备份

## 许可证

MIT

## 作者

Created with ❤️
