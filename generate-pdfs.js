const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const repoName = process.env.REPO_NAME || '';
const url = `http://localhost:8080/${repoName}/`;
const publicDir = path.join(__dirname, 'public');

const MARGIN_IN = 0.4;
const formats = [
  { file: 'public/resume.a4.pdf', format: 'A4', widthIn: 8.27, heightIn: 11.69 },
  { file: 'public/resume.letter.pdf', format: 'Letter', widthIn: 8.5, heightIn: 11 }
];

const mimeFor = (ext) => {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
};

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });
  await page.emulateMediaType('screen');

  await page.goto(url, { waitUntil: 'networkidle0' });

  await page.addStyleTag({
    content: `
      .container, .container-lg, .container-xl, .container-xxl {
        max-width: 100% !important;
      }
    `
  });

  // Remove the dark mode toggle entirely before printing
  await page.evaluate(() => {
    document.querySelectorAll('.dark-mode-switch').forEach((el) => el.remove());
  });

  // Inline images from disk so they always appear in the PDF
  const imgSrcs = await page.$$eval('img', (imgs) =>
    imgs.map((img) => img.getAttribute('src'))
  );

  for (const src of imgSrcs) {
    if (!src) continue;

    let relPath = src;
    const prefix = `/${repoName}/`;
    if (repoName && relPath.startsWith(prefix)) {
      relPath = relPath.slice(prefix.length);
    } else if (relPath.startsWith('/')) {
      relPath = relPath.slice(1);
    }

    const filePath = path.join(publicDir, relPath);

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      const mime = mimeFor(path.extname(filePath));
      const dataUri = `data:${mime};base64,${data.toString('base64')}`;

      await page.evaluate(
        (oldSrc, newSrc) => {
          document.querySelectorAll('img').forEach((img) => {
            if (img.getAttribute('src') === oldSrc) {
              img.src = newSrc;
            }
          });
        },
        src,
        dataUri
      );
      console.log('Inlined image from disk:', filePath);
    } else {
      console.error('Image file NOT found on disk at expected path:', filePath);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Fit everything on ONE page: widen the layout until the content,
  // scaled to the page width, is short enough to fit the page height
  for (const f of formats) {
    const printableW = (f.widthIn - 2 * MARGIN_IN) * 96;
    const printableH = (f.heightIn - 2 * MARGIN_IN) * 96;
    let scale = printableW / 900;

    for (let w = 900; w <= 2400; w += 50) {
      await page.setViewport({ width: w, height: 1000 });
      const contentH = await page.evaluate(
        () => document.documentElement.scrollHeight
      );
      scale = printableW / w;
      if (contentH * scale <= printableH * 0.97) break;
    }

    scale = Math.min(Math.max(scale, 0.1), 2);
    console.log(`${f.format}: using scale ${scale.toFixed(2)}`);

    await page.pdf({
      path: f.file,
      format: f.format,
      printBackground: true,
      scale,
      pageRanges: '1',
      margin: {
        top: `${MARGIN_IN}in`,
        bottom: `${MARGIN_IN}in`,
        left: `${MARGIN_IN}in`,
        right: `${MARGIN_IN}in`
      }
    });
  }

  await browser.close();
  console.log('PDFs generated successfully');
})();
