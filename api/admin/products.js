import { getClient, withErrorBoundary } from '../../src/lib/db.js';
import { requireAdmin, parseJsonBody } from '../../src/lib/auth.js';

const slugify = (value = '') => {
  const base = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return base ? `${base}-${suffix}` : `offer-${suffix}`;
};

const productsHandler = async (req, res) => {
  requireAdmin(req);
  const sql = getClient();

  if (req.method === 'GET') {
    const products = await sql`
      select
        p.id,
        p.name,
        p.hero_copy,
        p.price,
        p.status,
        p.created_at,
        coalesce(sum(o.quantity), 0) as times_purchased,
        coalesce(sum(o.amount), 0) as revenue
      from digital_products p
      left join product_orders o on o.product_id = p.id
      group by p.id
      order by p.created_at desc;
    `;

    return res.status(200).json({ products });
  }

  if (req.method === 'POST') {
    const { name, price, status, hero_copy: heroCopy } = parseJsonBody(req);
    if (!name) {
      const error = new Error('Product name is required');
      error.statusCode = 422;
      throw error;
    }

    const slug = slugify(name);
    const [product] = await sql`
      insert into digital_products (name, slug, hero_copy, price, status)
      values (${name}, ${slug}, ${heroCopy ?? null}, ${price ?? null}, ${status ?? 'draft'})
      returning id, name, hero_copy, price, status, created_at;
    `;

    return res.status(201).json({ product });
  }

  if (req.method === 'PATCH') {
    const { id, name, price, status, hero_copy: heroCopy } = parseJsonBody(req);
    if (!id) {
      const error = new Error('Product id is required');
      error.statusCode = 422;
      throw error;
    }

    const [product] = await sql`
      update digital_products
      set
        name = coalesce(${name ?? null}, name),
        price = coalesce(${price ?? null}::numeric, price),
        status = coalesce(${status ?? null}, status),
        hero_copy = coalesce(${heroCopy ?? null}, hero_copy),
        updated_at = now()
      where id = ${id}
      returning id, name, hero_copy, price, status, created_at, updated_at;
    `;

    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json({ product });
  }

  if (req.method === 'DELETE') {
    const { id } = parseJsonBody(req);
    if (!id) {
      const error = new Error('Product id is required');
      error.statusCode = 422;
      throw error;
    }

    await sql`delete from product_orders where product_id = ${id};`;
    const deleted = await sql`delete from digital_products where id = ${id} returning id;`;

    if (!deleted.length) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).json({ message: 'Method not allowed' });
};

export default withErrorBoundary(productsHandler);
