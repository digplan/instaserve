import https from 'https';
import crypto from 'crypto';
import { URL } from 'url';

const { CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_BUCKET_NAME } = process.env;

if (!CLOUDFLARE_ACCESS_KEY_ID || !CLOUDFLARE_SECRET_ACCESS_KEY || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_BUCKET_NAME) {
  console.warn("Cloudflare environment variables not set! Please set CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID, and CLOUDFLARE_BUCKET_NAME.");
}

/**
 * Cloudflare R2 / S3-Compatible Storage Module
 * 
 * Usage:
 * 1. Import desired functions or `fileRoutes` from this file.
 * 2. Requires a `secrets` object with:
 *    - cloudflareAccessKeyId
 *    - cloudflareSecretAccessKey
 *    - cloudflareAccountId
 * 
 * Exports:
 * - uploadToR2(bucket, key, body, contentType, secrets)
 * - downloadFromR2(bucket, key, secrets)
 * - deleteFromR2(bucket, key, secrets)
 * - listR2Files(bucket, prefix, secrets)
 * - getSignedDownloadUrl(bucket, key, secrets)
 * 
 * fileRoutes:
 * Contains helper handlers for file operations. Note that `upload`, `download`, `delete`
 * are generic async functions awaiting `data` parameters, while `POST /files` is a standard route.
 */

// --- Core SigV4 Utilities ---

const hashSHA256 = (str) => crypto.createHash('sha256').update(str).digest('hex');
const hmacSHA256 = (key, str) => crypto.createHmac('sha256', key).update(str).digest();

/**
 * FINAL FIX: Strict S3 encoding for the Object Key (Canonical URI Path).
 * This function encodes all necessary characters (including spaces as %20)
 * but preserves the path separator ('/'). It also ensures hex codes are uppercase,
 * which is critical for signature matching in some S3 implementations.
 */
const encodePath = (path) => {
  // 1. Encode all path components fully
  const segments = path.split('/').map(segment => encodeURIComponent(segment));

  // 2. Join the segments back with unencoded slashes
  const encodedPath = segments.join('/');

  // 3. Normalize: replace common encoding issues with uppercase hex for consistency
  // S3 requires these replacements for canonical request:
  return encodedPath.replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
};


/**
 * Creates SigV4 signed request components for Cloudflare R2 (S3-compatible).
 */
function signR2(method, bucket, key, body, accessKeyId, secretAccessKey, accountId, queryString = '') {
  const service = 's3', region = 'auto';
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');

  // Date format (YYYYMMDDTHHMMSSZ)
  const amzDate = now.toISOString().substring(0, 19).replace(/[:-]/g, '') + 'Z';

  // 1. Canonical URI - Uses the final, strict encodePath
  const objectPath = key ? encodePath(key) : '';
  const canonicalUri = `/${bucket}${objectPath ? '/' + objectPath : ''}`;

  // 2. Canonical Query String (Encoded, Sorted)
  const canonicalQuerystring = queryString ? queryString.split('&')
    .map(p => {
      const [k, v = ''] = p.split('=');
      // Decode then re-encode to prevent double encoding
      return {
        k: encodeURIComponent(decodeURIComponent(k)),
        v: encodeURIComponent(decodeURIComponent(v))
      };
    })
    .sort((a, b) => a.k.localeCompare(b.k) || a.v.localeCompare(b.v))
    .map(p => `${p.k}=${p.v}`).join('&') : '';

  // 3. Headers & Payload
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const payloadHash = ['GET', 'DELETE'].includes(method) ? 'UNSIGNED-PAYLOAD' : hashSHA256(body ?? '');
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;

  // 4. Canonical Request
  const canonicalRequest = [method, canonicalUri, canonicalQuerystring, canonicalHeaders, signedHeaders, payloadHash].join('\n');

  // 5. String to Sign & 6. Signature (Key Derivation)
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hashSHA256(canonicalRequest)].join('\n');

  // Key derivation condensed
  const kSigning = hmacSHA256(
    hmacSHA256(hmacSHA256(hmacSHA256(Buffer.from('AWS4' + secretAccessKey, 'utf8'), dateStamp), region), service),
    'aws4_request'
  );
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  // 7. Authorization Header & Final Request Prep
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // The URL must also use the same, correctly encoded objectPath
  const url = `https://${host}${canonicalUri}${canonicalQuerystring ? '?' + canonicalQuerystring : ''}`;

  const headers = {
    Host: host, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash, Authorization: authorization
  };

  if (body !== null && typeof body !== 'undefined') {
    headers['Content-Length'] = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
  }

  return { url, headers, body, method };
}

// ---- R2 request helper ----
function requestR2({ method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const req = https.request({ hostname, port: 443, path: pathname + (search || ''), method, headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString();
        if (res.statusCode >= 200 && res.statusCode < 308) {
          resolve(data);
        } else {
          reject(new Error(`R2 request failed: Status ${res.statusCode} ${res.statusMessage}. Body: ${data.substring(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// --- API Helpers ---

async function uploadToR2(bucket, key, body, contentType, secrets) {
  bucket = bucket || CLOUDFLARE_BUCKET_NAME;
  if (!body) body = Buffer.alloc(0);
  const signed = signR2('PUT', bucket, key, body, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID);
  await requestR2(signed);
  return { success: true };
}

async function downloadFromR2(bucket, key, secrets) {
  bucket = bucket || CLOUDFLARE_BUCKET_NAME;
  const signed = signR2('GET', bucket, key, null, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID);
  const { hostname, pathname, search } = new URL(signed.url);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      port: 443,
      path: pathname + (search || ''),
      method: 'GET',
      headers: signed.headers
    }, res => {
      if (res.statusCode >= 200 && res.statusCode < 308) {
        resolve(res);
      } else {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          reject(new Error(`Download failed: ${res.statusCode} ${errorData.substring(0, 200)}`));
        });
      }
    });
    req.on('error', reject);
    req.end();
  });
}

async function deleteFromR2(bucket, key) {
  bucket = bucket || CLOUDFLARE_BUCKET_NAME;
  await requestR2(signR2('DELETE', bucket, key, null, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID));
  return { success: true };
}

async function listR2Files(bucket, prefix, secrets) {
  bucket = bucket || CLOUDFLARE_BUCKET_NAME;
  const qs = prefix ? `list-type=2&prefix=${encodeURIComponent(prefix)}` : 'list-type=2';
  const data = await requestR2(signR2('GET', bucket, '', null, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID, qs));
  const keys = [...data.matchAll(/<Key>(.*?)<\/Key>/g)].map(([, k]) => k);
  const sizes = [...data.matchAll(/<Size>(\d+)<\/Size>/g)].map(([, s]) => parseInt(s, 10));
  const mods = [...data.matchAll(/<LastModified>(.*?)<\/LastModified>/g)].map(([, m]) => m);
  return keys.map((k, i) => ({ key: k, size: sizes[i] || 0, lastModified: mods[i] || '' }));
}

function getSignedDownloadUrl(bucket, key, secrets) {
  bucket = bucket || CLOUDFLARE_BUCKET_NAME;
  return signR2('GET', bucket, key, null, CLOUDFLARE_ACCESS_KEY_ID, CLOUDFLARE_SECRET_ACCESS_KEY, CLOUDFLARE_ACCOUNT_ID).url;
}

export const fileRoutes = {
  upload: async (req, res, data) => {
    try {
      let body = data.body;
      if (typeof body === 'string') {
        body = Buffer.from(body, 'base64');
      } else if (body) {
        body = Buffer.from(body);
      } else {
        body = Buffer.alloc(0);
      }
      return await uploadToR2(data.bucket, data.key, body, data.contentType);
    } catch (e) { return { error: e.message }; }
  },
  download: async (req, res, data) => {
    try {
      const r2Msg = await downloadFromR2(data.bucket, data.key);
      res.writeHead(r2Msg.statusCode, r2Msg.statusMessage, r2Msg.headers);

      await new Promise((resolve, reject) => {
        r2Msg.pipe(res);
        r2Msg.on('error', (err) => {
          res.destroy(err);
          reject(err);
        });
        res.on('finish', resolve);
        res.on('error', reject);
      });

      // returning nothing to prevent sendResponse from interfering
      return;
    } catch (e) {
      // If headers weren't sent yet, we can return error JSON
      if (!res.headersSent) {
        return { error: e.message };
      }
      // If headers were sent, we can't cleanly return JSON, 
      // but the stream error handling above usually takes care of destroying the socket.
      console.error("Download stream error:", e);
    }
  },

  delete: async (req, res, data) => {
    try {
      return await deleteFromR2(data.bucket, data.key);
    } catch (e) { return { error: e.message }; }
  },

  "POST /files": async (req, res, data) => {
    try {
      return await listR2Files();
    } catch (e) { return { error: e.message }; }
  }
};

export default {
  uploadToR2,
  downloadFromR2,
  deleteFromR2,
  listR2Files,
  getSignedDownloadUrl
};
