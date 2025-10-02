import { getClient, withErrorBoundary } from '../../src/lib/db.js';
import { requireAdmin, parseJsonBody, hashPassword } from '../../src/lib/auth.js';

const normaliseEmail = (email = '') => email.trim().toLowerCase();

const usersHandler = async (req, res) => {
  requireAdmin(req);
  const sql = getClient();

  if (req.method === 'GET') {
    const users = await sql`
      select
        u.id,
        u.full_name,
        u.email,
        u.is_admin,
        u.created_at,
        coalesce(sum(o.amount), 0) as total_spent,
        coalesce(json_agg(
          json_build_object(
            'orderId', o.id,
            'productId', o.product_id,
            'productName', p.name,
            'quantity', o.quantity,
            'amount', o.amount,
            'purchasedAt', o.created_at
          )
        ) filter (where o.id is not null), '[]'::json) as purchases
      from studio_users u
      left join product_orders o on o.user_id = u.id
      left join digital_products p on p.id = o.product_id
      group by u.id
      order by u.created_at desc;
    `;

    return res.status(200).json({ users });
  }

  if (req.method === 'POST') {
  const { full_name: fullName, email, is_admin: isAdmin, password } = parseJsonBody(req);
  if (!fullName || !email || !password) {
    const error = new Error('Full name, email, and password are required');
    error.statusCode = 422;
    throw error;
  }

  const normalisedEmail = normaliseEmail(email);

  const { hash, salt } = hashPassword(password);

  const [user] = await sql`
      insert into studio_users (full_name, email, is_admin, password_hash, password_salt)
      values (
        ${fullName},
        ${normalisedEmail},
        coalesce(${isAdmin ?? false}::boolean, false),
        ${hash},
        ${salt}
      )
      on conflict (email) do update set
        full_name = excluded.full_name,
        is_admin = excluded.is_admin,
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        updated_at = now()
      returning id, full_name, email, is_admin, created_at;
    `;

    return res.status(201).json({ user });
  }

  if (req.method === 'PATCH') {
  const { id, full_name: fullName, email, is_admin: isAdmin, password } = parseJsonBody(req);
  if (!id) {
    const error = new Error('User id is required');
    error.statusCode = 422;
    throw error;
  }

  let passwordHash = null;
  let passwordSalt = null;
  if (password) {
    const result = hashPassword(password);
    passwordHash = result.hash;
    passwordSalt = result.salt;
  }

  const [user] = await sql`
      update studio_users
      set
        full_name = coalesce(${fullName ?? null}, full_name),
        email = coalesce(${email ? normaliseEmail(email) : null}, email),
        is_admin = coalesce(${isAdmin ?? null}::boolean, is_admin),
        password_hash = coalesce(${passwordHash}, password_hash),
        password_salt = coalesce(${passwordSalt}, password_salt),
        updated_at = now()
      where id = ${id}
      returning id, full_name, email, is_admin, created_at, updated_at;
    `;

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json({ user });
  }

  if (req.method === 'DELETE') {
    const { id } = parseJsonBody(req);
    if (!id) {
      const error = new Error('User id is required');
      error.statusCode = 422;
      throw error;
    }

    await sql`delete from product_orders where user_id = ${id};`;
    const deleted = await sql`delete from studio_users where id = ${id} returning id;`;

    if (!deleted.length) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return res.status(204).end();
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).json({ message: 'Method not allowed' });
};

export default withErrorBoundary(usersHandler);
