@echo off
echo Setting up CallDocker Cloud Development Environment...

echo.
echo 1. Creating .env file for cloud development...
if not exist .env.cloud (
    copy env.example .env.cloud
    echo Created .env.cloud file from template
) else (
    echo .env.cloud file already exists
)

echo.
echo 2. Cloud Database Options:
echo - Supabase (PostgreSQL): https://supabase.com
echo - Neon (PostgreSQL): https://neon.tech
echo - Railway (PostgreSQL): https://railway.app
echo.
echo 3. Cloud Redis Options:
echo - Redis Cloud: https://redis.com/redis-enterprise-cloud
echo - Upstash Redis: https://upstash.com
echo - Railway Redis: https://railway.app
echo.
echo 4. Cloud Storage Options:
echo - AWS S3: https://aws.amazon.com/s3
echo - Cloudflare R2: https://www.cloudflare.com/products/r2
echo - Supabase Storage: https://supabase.com/storage

echo.
echo Update .env.cloud with your cloud service URLs
echo Then run: cargo run --bin auth-service -- --config .env.cloud
echo.
pause
