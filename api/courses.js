import { getClient, withErrorBoundary } from '../src/lib/db.js';

const coursesHandler = async (_req, res) => {
  const sql = getClient();
  const courses = await sql`
    select id, title, cohort_type, duration_weeks, enrollment_status
    from courses
    where enrollment_status != 'archived'
    order by position asc;
  `;

  res.status(200).json({ courses });
};

export default withErrorBoundary(coursesHandler);
