const puppeteer = require('puppeteer');

const repoName = process.env.REPO_NAME || '';
const url = `http://localhost:8080/${repoName}/`;

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600 });

  await page.emulateMediaType('screen');

  await page.goto(url, { waitUntil: 'networkidle0' });

  // Wait for all images to finish their initial load
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        });
      })
    );
  });

  // Inline every image as a base64 data URL, removing any dependency
  // on the local server still being reachable at print time
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(
      images.map(async (img) => {
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
        } catch (err) {
          console.error('Failed to inline image:', img.src, err.message);
        }
      })
    );
  });

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
