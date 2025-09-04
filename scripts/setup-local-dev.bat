@echo off
echo Setting up CallDocker Local Development Environment...

echo.
echo 1. Creating .env file...
if not exist .env (
    copy env.example .env
    echo Created .env file from template
) else (
    echo .env file already exists
)

echo.
echo 2. Setting up database...
echo Please install PostgreSQL locally or use a cloud database
echo Update the DATABASE_URL in .env file with your connection string

echo.
echo 3. Setting up Redis...
echo Please install Redis locally or use a cloud Redis instance
echo Update the REDIS_URL in .env file with your connection string

echo.
echo 4. Setting up MinIO...
echo Please install MinIO locally or use a cloud storage service
echo Update the MINIO_* variables in .env file

echo.
echo Local development setup complete!
echo Next steps:
echo 1. Install PostgreSQL and Redis locally
echo 2. Update .env file with your connection strings
echo 3. Run: cargo run --bin auth-service
echo.
pause
