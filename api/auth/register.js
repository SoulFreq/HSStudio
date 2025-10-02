import { getClient, withErrorBoundary } from '../../src/lib/db.js';
import { hashPassword, createSessionToken, parseJsonBody } from '../../src/lib/auth.js';

const normaliseEmail = (email = '') => email.trim().toLowerCase();

const registerHandler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { full_name: fullName, email, password } = parseJsonBody(req);
  if (!fullName || !email || !password) {
    const error = new Error('Full name, email, and password are required');
    error.statusCode = 422;
    throw error;
  }

  const sql = getClient();
  const normalisedEmail = normaliseEmail(email);

  const existing = await sql`
    select id from studio_users where email = ${normalisedEmail} limit 1;
  `;

  if (existing.length) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  const { hash, salt } = hashPassword(password);

  const [user] = await sql`
    insert into studio_users (full_name, email, password_hash, password_salt, is_admin)
    values (${fullName}, ${normalisedEmail}, ${hash}, ${salt}, false)
    returning id, full_name, email, is_admin, created_at;
  `;

  const token = createSessionToken(user.id);

  return res.status(201).json({
    token,
    user,
  });
};

export default withErrorBoundary(registerHandler);
