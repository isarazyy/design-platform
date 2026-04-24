import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generate(htmlFile, pdfFile) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(__dirname, htmlFile), { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.join(__dirname, pdfFile),
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
  });
  await browser.close();
  console.log('Generated:', pdfFile);
  fs.unlinkSync(path.join(__dirname, htmlFile));
}

await generate('tmp-intro.html', '产品介绍.pdf');
await generate('tmp-manual.html', '使用说明.pdf');
