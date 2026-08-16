const puppeteer = require('puppeteer');

const repoName = process.env.REPO_NAME || '';
const url = `http://localhost:8080/${repoName}/`;

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });

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
