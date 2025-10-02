export const requireAdmin = (req) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    const error = new Error('Missing ADMIN_TOKEN environment variable');
    error.statusCode = 500;
    throw error;
  }

  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : null;

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
