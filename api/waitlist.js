import { getClient, withErrorBoundary } from '../src/lib/db.js';

const waitlistHandler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(422).json({ message: 'Email is required' });
  }

  const sql = getClient();

  await sql`
    insert into waitlist_subscribers (email, created_at)
    values (${email}, now())
    on conflict (email) do update
      set updated_at = now()
    returning id;
  `;

  return res.status(201).json({ message: 'Welcome to the HigherSelf signal.' });
};

export default withErrorBoundary(waitlistHandler);
