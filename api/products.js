import { getClient, withErrorBoundary } from '../src/lib/db.js';

const productsHandler = async (_req, res) => {
  const sql = getClient();
  const products = await sql`
    select id, name, slug, hero_copy, price, status
    from digital_products
    where status = 'published'
    order by created_at desc
    limit 12;
  `;

  res.status(200).json({ products });
};

export default withErrorBoundary(productsHandler);
