import { getClient, withErrorBoundary } from '../../src/lib/db.js';
import { verifyPassword, createSessionToken, parseJsonBody } from '../../src/lib/auth.js';

const normaliseEmail = (email = '') => email.trim().toLowerCase();

const loginHandler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = parseJsonBody(req);
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = 422;
    throw error;
  }

  const sql = getClient();
  const normalisedEmail = normaliseEmail(email);

  const [user] = await sql`
    select id, full_name, email, password_hash, password_salt, is_admin, created_at
    from studio_users
    where email = ${normalisedEmail}
    limit 1;
  `;

  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  await sql`
    update studio_users
    set last_login_at = now()
    where id = ${user.id};
  `;

  const token = createSessionToken(user.id);

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      is_admin: user.is_admin,
      created_at: user.created_at,
    },
  });
};

export default withErrorBoundary(loginHandler);
