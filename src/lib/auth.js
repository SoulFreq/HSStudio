import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SESSION_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

const ensureEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    const error = new Error(`Missing ${key} environment variable`);
    error.statusCode = 500;
    throw error;
  }
  return value;
};

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

export const hashPassword = (password) => {
  const candidate = typeof password === 'string' ? password : String(password || '');
  if (!candidate || candidate.length < 8) {
    const error = new Error('Passwords must be at least 8 characters long');
    error.statusCode = 422;
    throw error;
  }
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(candidate, salt, 64).toString('hex');
  return { hash, salt };
};

export const verifyPassword = (password, hash, salt) => {
  if (!hash || !salt) return false;
  const candidate = typeof password === 'string' ? password : String(password || '');
  const derived = scryptSync(candidate, salt, 64).toString('hex');
  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedBuffer = Buffer.from(derived, 'hex');
  if (hashBuffer.length !== derivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(hashBuffer, derivedBuffer);
};

const base64UrlEncode = (payload) =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

const base64UrlDecode = (encoded) => {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch (error) {
    const err = new Error('Invalid session token');
    err.statusCode = 401;
    throw err;
  }
};

export const createSessionToken = (userId) => {
  const secret = ensureEnv('SESSION_SECRET');
  const issuedAt = Date.now();
  const payload = {
    sub: userId,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL,
  };
  const encoded = base64UrlEncode(payload);
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
};

export const verifySessionToken = (token) => {
  if (!token) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }
  const [encoded, signature] = parts;
  const secret = ensureEnv('SESSION_SECRET');
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  const providedBuf = Buffer.from(signature, 'base64url');
  const expectedBuf = Buffer.from(expected, 'base64url');
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }

  const payload = base64UrlDecode(encoded);
  if (!payload?.sub || !payload?.exp || Date.now() > payload.exp) {
    const error = new Error('Session expired');
    error.statusCode = 401;
    throw error;
  }

  return payload;
};

export const requireSession = (req) => {
  const token = getBearerToken(req);
  const payload = verifySessionToken(token);
  return payload.sub;
};

export const requireAdmin = (req) => {
  const token = ensureEnv('ADMIN_TOKEN');
  const provided = getBearerToken(req);

  if (!provided || provided !== token) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }
};

export const parseJsonBody = (req) => {
  if (!req.body || typeof req.body === 'object') {
    return req.body || {};
  }

  try {
    return JSON.parse(req.body);
  } catch (error) {
    const err = new Error('Invalid JSON body');
    err.statusCode = 400;
    throw err;
  }
};
*** End Patch
PATCH
