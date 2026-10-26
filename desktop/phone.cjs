const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const QRCode = require('qrcode');

async function startPhone(library, notify) {
  const token = randomBytes(24).toString('hex');
  let active = 0, count = 0;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (url.searchParams.get('key') !== token) { res.writeHead(403).end('This upload session has ended.'); return; }
    if (req.method === 'GET' && url.pathname === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>MYjong · Send photos</title>
      <style>body{font:18px system-ui;background:#123e36;color:#fff1d5;max-width:480px;margin:60px auto;padding:24px}button,input{font:inherit;padding:14px;max-width:100%}button{background:#f4d292;border:0;border-radius:12px}p{line-height:1.6}</style>
      <h1>MYjong</h1><h2>A few familiar faces.</h2><p>Choose photos to copy to your computer. Keep both devices on the same Wi-Fi and keep MYjong open. Its QR window closes automatically when photos arrive; your selected photos will continue sending.</p><input id="files" type="file" accept="image/*,.heic,.heif" multiple><p><button id="send">Send selected photos</button></p><p id="status" role="status"></p>
      <script>document.querySelector('#send').onclick=async()=>{const b=document.querySelector('#send'),s=document.querySelector('#status'),f=[...document.querySelector('#files').files];b.disabled=true;let ok=0;try{for(const file of f){s.textContent='Sending '+(ok+1)+' of '+f.length+'…';const r=await fetch('/upload'+location.search+'&name='+encodeURIComponent(file.name),{method:'POST',body:file});if(!r.ok)throw Error(await r.text());ok++;}s.textContent=ok+' photos sent. You can return to MYjong.';}catch(e){s.textContent=e.message+' ('+ok+' sent)';}b.disabled=false;};</script>`);
      return;
    }
    if (req.method !== 'POST' || url.pathname !== '/upload' || active >= 2 || count >= 500) { res.writeHead(429).end('Please wait or start a new import session.'); return; }
    const ext = path.extname(url.searchParams.get('name') || '').toLowerCase();
    if (!['.jpg','.jpeg','.png','.webp','.heic','.heif','.avif'].includes(ext)) { res.writeHead(415).end('Choose a JPEG, PNG, WebP, AVIF or HEIC photo.'); return; }
    active++; count++;
    let temp;
    try {
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 40 * 1024 * 1024) { res.writeHead(413).end('Photo is larger than 40 MB.'); req.destroy(); return; }
        chunks.push(chunk);
      }
      const dir = path.join(library.root, 'incoming'); await fs.mkdir(dir, { recursive: true });
      temp = path.join(dir, `${randomUUID()}${ext}`);
      await fs.writeFile(temp, Buffer.concat(chunks));
      const result = await library.import([temp]);
      if (result.errors.length) throw Error(result.errors[0]);
      notify(result.addedIds); res.writeHead(200).end('Received');
    } catch { if (!res.headersSent) res.writeHead(400).end('This photo could not be imported. Try a JPEG copy.'); }
    finally { active--; if (temp) await fs.rm(temp, { force: true }).catch(() => {}); }
  });
  server.requestTimeout = 120000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '0.0.0.0', resolve); });
  const addresses = Object.values(os.networkInterfaces()).flat().filter(n => n.family === 'IPv4' && !n.internal);
  const preferred = addresses.find(n => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address)) || addresses[0];
  if (!preferred) { server.close(); throw Error('Connect this computer to Wi-Fi first.'); }
  const url = `http://${preferred.address}:${server.address().port}/?key=${token}`;
  const timer = setTimeout(() => server.close(), 15 * 60 * 1000); timer.unref();
  return { url, qr: await QRCode.toDataURL(url, { width: 280, margin: 2 }), close: () => { clearTimeout(timer); server.close(); } };
}
module.exports = { startPhone };
