# SQLite to Neon Database Migration Guide

This guide will help you migrate your data from SQLite to Neon (PostgreSQL) database.

## Prerequisites

1. **Neon Database Setup**: You should have already run `npx neonctl@latest init` to set up your Neon database
2. **Python Environment**: Make sure your virtual environment is activated
3. **Dependencies**: Install the required packages (including `psycopg2-binary`)

## Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install `psycopg2-binary` which is required for PostgreSQL/Neon connections.

## Step 2: Get Your Neon Connection String

You can get your Neon connection string in one of the following ways:

### Option A: Using neonctl
```bash
npx neonctl@latest connection-string
```

### Option B: From Neon Dashboard
1. Go to your Neon project dashboard
2. Navigate to the "Connection Details" section
3. Copy the connection string (it should look like: `postgresql://user:password@host:port/database?sslmode=require`)

## Step 3: Set the DATABASE_URL Environment Variable

### On Windows (Command Prompt):
```cmd
set DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

### On Windows (PowerShell):
```powershell
$env:DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

### On Linux/Mac:
```bash
export DATABASE_URL='postgresql://user:password@host:port/database?sslmode=require'
```

**Important**: Replace `user`, `password`, `host`, `port`, and `database` with your actual Neon database credentials.

## Step 4: Run the Migration Script

```bash
python migrate_to_neon.py
```

The script will:
1. Connect to your SQLite database (source)
2. Connect to your Neon database (target)
3. Create all necessary tables in Neon (if they don't exist)
4. Migrate all data in the correct order (respecting foreign key relationships)
5. Verify that all data was migrated correctly
6. Reset PostgreSQL sequences to prevent ID conflicts

## Step 5: Verify the Migration

The script will automatically verify the migration by comparing row counts between SQLite and Neon. You should see output like:

```
🔍 Verifying migration...
   ✅ uploads: SQLite=10, Neon=10
   ✅ raw_data: SQLite=500, Neon=500
   ...
```

## Step 6: Test Your Application

After migration, test your application to ensure everything works:

1. **Keep DATABASE_URL set** - Your application will now use Neon instead of SQLite
2. **Start your application**:
   ```bash
   uvicorn api.main:app --host 0.0.0.0 --port 8001
   ```
3. **Test all functionality** - Upload files, view data, check charts, etc.

## Important Notes

### Backward Compatibility
- Your application code **does not need to change** - the schema remains identical
- The `api/database.py` file now automatically detects if `DATABASE_URL` is set
- If `DATABASE_URL` is not set, it falls back to SQLite (for local development)

### Data Safety
- The migration script **does not delete** your SQLite database
- Your original data remains safe in the SQLite file
- You can always switch back to SQLite by unsetting `DATABASE_URL`

### Production Deployment
- For production, set `DATABASE_URL` as an environment variable in your hosting platform (Railway, Vercel, etc.)
- The application will automatically use Neon when `DATABASE_URL` is set

## Troubleshooting

### Error: "DATABASE_URL environment variable is not set"
- Make sure you've set the `DATABASE_URL` environment variable before running the migration script
- Verify the connection string format is correct

### Error: "Could not connect to database"
- Check that your Neon database is running and accessible
- Verify your connection string credentials are correct
- Ensure your IP is allowed in Neon's firewall settings (if applicable)

### Error: "Table already has data"
- The script will ask if you want to continue if it finds existing data
- If you want to start fresh, you can manually clear the tables in Neon first
- Or answer 'y' to add the SQLite data to existing Neon data

### Sequence Reset Warnings
- If you see warnings about sequences, that's usually okay
- Sequences are automatically created when tables are created
- The warnings won't affect data migration

## Rollback (If Needed)

If you need to switch back to SQLite:

1. **Unset DATABASE_URL**:
   - Windows: `set DATABASE_URL=`
   - Linux/Mac: `unset DATABASE_URL`

2. **Restart your application** - It will automatically use SQLite again

Your SQLite database file (`poultry_dashboard.db`) is still intact and contains all your original data.

## Support

If you encounter any issues during migration:
1. Check the error messages in the console
2. Verify your Neon connection string
3. Ensure all dependencies are installed
4. Check that your SQLite database file exists and is accessible

