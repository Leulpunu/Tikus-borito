# Tikus Borito production setup

## 1. Create the Supabase project

1. Create a Supabase project in the region closest to the restaurant.
2. Open the SQL editor and run `supabase/migrations/001_initial_schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in the project URL, publishable key, and server-only secret key.
4. Set a strong temporary manager email/password and run `npm run setup:manager` once.
5. Remove `BOOTSTRAP_MANAGER_PASSWORD` from `.env.local` after the manager exists.

Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_DB_URL` to the browser. Only variables beginning with `NEXT_PUBLIC_` are intended for client code.

## 2. Verify locally

```bash
npm test
npm run lint
npm run build
npm run dev
```

Sign in as the manager, then verify product creation, image upload, order creation, kitchen status progression, cashier payment, cancellation, notes, and Excel/PDF exports.

## 3. Deploy to Vercel

1. Push the repository to a private GitHub repository.
2. Import it into Vercel as a Next.js project.
3. Add these production environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
4. Deploy and open `/api/health`; it should return `status: ok` and `persistence: supabase`.
5. Add the production URL to the Supabase Authentication URL configuration.

Do not configure the bootstrap password in Vercel. New staff accounts are created by a signed-in manager.

## 4. Backups and recovery

Supabase database backups should be enabled and their retention checked for the selected plan. For an additional manual backup, install PostgreSQL client tools, set the direct database connection string only for the current shell, and run:

```powershell
$env:SUPABASE_DB_URL = "postgresql://..."
npm run backup:database
Remove-Item Env:SUPABASE_DB_URL
```

Backups are written to the ignored `backups/` directory. Periodically restore a backup into a separate test project; a backup that has never been restored is not fully verified.

## 5. Operations checklist

- Require unique staff accounts; never share the manager password.
- Remove accounts immediately when staff leave.
- Review failed CI checks before deployment.
- Monitor `/api/health` from an external uptime service.
- Rotate the service-role key if it is ever exposed.
- Test report export and database restore monthly.
