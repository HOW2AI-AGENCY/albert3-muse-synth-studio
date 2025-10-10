@echo off
REM Deploy All Edge Functions Script (Windows)
REM This script deploys all edge functions to your Supabase project

SET PROJECT_REF=qycfsepwguaiwcquwwbw

echo ============================================
echo Deploying all Edge Functions
echo Project: %PROJECT_REF%
echo ============================================
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if supabase CLI is available
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Supabase CLI not found. Installing...
    call npm install -g supabase
)

REM Check if logged in
echo Checking Supabase authentication...
call supabase projects list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Not logged in to Supabase. Running login...
    call supabase login
)

REM Link to project
echo Linking to project...
call supabase link --project-ref %PROJECT_REF%

echo.
echo ============================================
echo Starting deployment...
echo ============================================
echo.

SET successful=0
SET failed=0

REM Deploy each function
FOR %%F IN (
    generate-suno
    suno-callback
    generate-lyrics
    lyrics-callback
    sync-lyrics-job
    improve-prompt
    separate-stems
    stems-callback
    sync-stem-job
    get-balance
    suggest-styles
) DO (
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo Deploying: %%F
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    call npx supabase functions deploy %%F --project-ref %PROJECT_REF%
    
    if %ERRORLEVEL% EQU 0 (
        echo ✅ %%F deployed successfully
        SET /A successful+=1
    ) else (
        echo ❌ Failed to deploy %%F
        SET /A failed+=1
    )
    echo.
)

echo.
echo ============================================
echo Deployment Summary
echo ============================================
echo ✅ Successful: %successful%
echo ❌ Failed: %failed%
echo.

if %failed% GTR 0 (
    echo 💡 Tips for fixing deployment failures:
    echo   1. Check that the function files exist in supabase/functions/
    echo   2. Verify you have the correct permissions
    echo   3. Check the error messages above
    echo   4. Ensure all dependencies are installed
    pause
    exit /b 1
) else (
    echo 🎉 All functions deployed successfully!
    echo.
    echo Next steps:
    echo   1. Set environment variables in Supabase Dashboard:
    echo      https://supabase.com/dashboard/project/%PROJECT_REF%/settings/functions
    echo   2. Add required secrets (SUNO_API_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.)
    echo   3. Test your functions
    echo.
    echo To verify deployment:
    echo   supabase functions list --project-ref %PROJECT_REF%
    pause
    exit /b 0
)
