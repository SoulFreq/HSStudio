import { getClient, withErrorBoundary } from '../../src/lib/db.js';
import { requireAdmin } from '../../src/lib/auth.js';

const statsHandler = async (req, res) => {
  requireAdmin(req);
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const sql = getClient();

  const [overview] = await sql`
    select
      (select count(*) from studio_users) as total_users,
      (select coalesce(sum(quantity), 0) from product_orders) as total_purchases,
      (select coalesce(sum(amount), 0) from product_orders) as total_revenue;
  `;

  const product_breakdown = await sql`
    select
      p.id,
      p.name,
      p.status,
      coalesce(sum(o.quantity), 0) as purchase_count,
      coalesce(sum(o.amount), 0) as revenue
    from digital_products p
    left join product_orders o on o.product_id = p.id
    group by p.id
    order by revenue desc;
  `;

  return res.status(200).json({
    total_users: overview?.total_users || 0,
    total_purchases: overview?.total_purchases || 0,
    total_revenue: overview?.total_revenue || 0,
    product_breakdown,
  });
};

export default withErrorBoundary(statsHandler);
