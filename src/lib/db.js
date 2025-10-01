import { neon } from '@neondatabase/serverless';

let cachedClient;

/**
 * Returns a singleton Neon SQL client so serverless invocations stay warm.
 */
export const getClient = () => {
  if (cachedClient) return cachedClient;
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing NEON_DATABASE_URL environment variable');
  }
  cachedClient = neon(connectionString);
  return cachedClient;
};

export const withErrorBoundary = (fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    console.error('[HigherSelfStudio] API error', error);
    res.status(500).json({ message: 'Internal error, please retry shortly.' });
  }
};
