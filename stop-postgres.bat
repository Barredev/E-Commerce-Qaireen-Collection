@echo off
echo Stopping PostgreSQL...
"C:\Users\Gobertajirmelintir\.local\pgsql_extract\pgsql\bin\pg_ctl.exe" -D "C:\Users\Gobertajirmelintir\.local\pgdata" stop
echo.
pause
