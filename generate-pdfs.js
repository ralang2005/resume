const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const repoName = process.env.REPO_NAME || '';
const url = `http://localhost:8080/${repoName}/`;
const publicDir = path.join(__dirname, 'public');

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

  const imgSrcs = await page.$$eval('img', (imgs) =>
    imgs.map((img) => img.getAttribute('src'))
  );
  console.log('Found image src attributes:', imgSrcs);

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

  // Give the browser a moment to repaint with the new inline image data
  await new Promise((resolve) => setTimeout(resolve, 500));

  await page.pdf({
    path: 'public/resume.a4.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' }
  });

  await page.pdf({
    path: 'public/resume.letter.pdf',
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' }
  });

  await browser.close();
  console.log('PDFs generated successfully');
})();
