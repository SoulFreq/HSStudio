import { getClient, withErrorBoundary } from '../../src/lib/db.js';
import { requireSession } from '../../src/lib/auth.js';

const profileHandler = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userId = requireSession(req);
  const sql = getClient();

  const [user] = await sql`
    select id, full_name, email, is_admin, created_at, last_login_at
    from studio_users
    where id = ${userId}
    limit 1;
  `;

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const purchases = await sql`
    select
      o.id,
      o.product_id,
      p.name as product_name,
      o.quantity,
      o.amount,
      o.created_at
    from product_orders o
    left join digital_products p on p.id = o.product_id
    where o.user_id = ${userId}
    order by o.created_at desc;
  `;

  return res.status(200).json({
    user,
    purchases,
  });
};

export default withErrorBoundary(profileHandler);
