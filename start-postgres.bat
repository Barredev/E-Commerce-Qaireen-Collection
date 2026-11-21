@echo off
echo Starting PostgreSQL...
"C:\Users\Gobertajirmelintir\.local\pgsql_extract\pgsql\bin\pg_ctl.exe" -D "C:\Users\Gobertajirmelintir\.local\pgdata" -l "C:\Users\Gobertajirmelintir\.local\pg.log" start
echo.
"C:\Users\Gobertajirmelintir\.local\pgsql_extract\pgsql\bin\pg_ctl.exe" -D "C:\Users\Gobertajirmelintir\.local\pgdata" status
echo.
pause
