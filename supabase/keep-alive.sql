-- JFM PrintHub — free-tier keep-alive (run once in the Supabase SQL Editor)
--
-- What it does: every 10 minutes during shop hours, Supabase itself calls the API's
-- /actuator/health endpoint on Render. That one call:
--   * stops Render's free API from sleeping while the shop is open (no ~1 min wake-up), and
--   * makes the API query the database, so Supabase never sees "inactivity" and never pauses.
--
-- BEFORE RUNNING: replace the URL below with your real Render API URL.
-- Schedule: 6:00 AM – 10:00 PM Manila time (= 22:00–13:59 UTC). Uses ~500 of Render's
-- 750 free hours per month. For 24/7, change the schedule to '*/10 * * * *' (~720 hours).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove an older copy of the job if you're re-running this file.
select cron.unschedule(jobid) from cron.job where jobname = 'jfm-keepalive';

select cron.schedule(
  'jfm-keepalive',
  '*/10 22,23,0-13 * * *',
  $$ select net.http_get(
       url := 'https://jfm-printhub-api-znz2.onrender.com/actuator/health',
       timeout_milliseconds := 90000
     ); $$
);

-- Check it's working (after ~10 minutes): status_code should be 200.
-- select created, status_code, left(content, 80) from net._http_response order by created desc limit 5;

-- To stop it:
-- select cron.unschedule('jfm-keepalive');
