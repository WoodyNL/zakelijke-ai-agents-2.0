"""Isolated PostgreSQL regression tests; never connects to the app database."""
import os
import pathlib
import shutil
import subprocess
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = ROOT / 'supabase/migrations/20261023120000_beheerders_beheren.sql'
FIX = ROOT / 'drizzle/migrations/0024_beheerders_serieel.sql'
temp = pathlib.Path(tempfile.mkdtemp(prefix='admin-regression-', dir='/tmp'))
prefix = []
if os.geteuid() == 0:
    import pwd
    account = pwd.getpwnam('lovable')
    os.chown(temp, account.pw_uid, account.pw_gid)
    prefix = ['setpriv', '--reuid=1000', '--regid=1000', '--clear-groups', '--']

def command(*args):
    result = subprocess.run(prefix + list(args), text=True, capture_output=True)
    if result.returncode:
        print(result.stderr)
    result.check_returncode()
    return result

def sql(query, check=True):
    return subprocess.run(prefix + ['psql', '-U', 'testadmin', '-h', str(temp), '-p', '55439', '-d', 'postgres',
        '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], text=True, capture_output=True, check=check)

A = '00000000-0000-0000-0000-000000000001'
B = '00000000-0000-0000-0000-000000000002'
started = False
try:
    command('initdb', '-U', 'testadmin', '-D', str(temp / 'data'), '-A', 'trust', '--no-locale')
    command('pg_ctl', '-D', str(temp / 'data'), '-l', str(temp / 'log'), '-o',
        f'-k {temp} -p 55439 -c listen_addresses=', '-w', 'start')
    started = True
    sql('''CREATE SCHEMA private; CREATE SCHEMA auth;
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'support');
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
      CREATE TABLE public.profiles (id uuid PRIMARY KEY, name text, email text);
      CREATE TABLE public.user_roles (user_id uuid, role public.app_role, UNIQUE(user_id, role));
    ''')
    sql(f"INSERT INTO auth.users VALUES ('{A}', 'wouterransijn@gmail.com', '{{}}'); INSERT INTO public.user_roles VALUES ('{A}', 'admin');")
    sql(BASE.read_text())
    sql(BASE.read_text())
    assert sql("SELECT count(*) FROM public.user_roles WHERE role='admin'").stdout.strip() == '1'
    sql("CREATE TRIGGER new_user AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();")
    sql(f"INSERT INTO auth.users VALUES ('{B}', 'wouterransijn@gmail.com', '{{}}');")
    assert sql(f"SELECT role FROM public.user_roles WHERE user_id='{B}'").stdout.strip() == 'client'
    for action in [f"DELETE FROM public.user_roles WHERE user_id='{A}'", f"UPDATE public.user_roles SET role='client' WHERE user_id='{A}'"]:
        assert sql(action, check=False).returncode != 0
    # Confirm the original race, then confirm the identical reproduction is denied.
    for protected in [False, True]:
        if protected:
            sql(FIX.read_text()); sql(FIX.read_text())
        for isolation in ['READ COMMITTED', 'REPEATABLE READ']:
            for demotion in [False, True]:
                sql('TRUNCATE public.user_roles;')
                sql(f"INSERT INTO public.user_roles VALUES ('{A}','admin'), ('{B}','admin');")
                def action(uid):
                    return (f"UPDATE public.user_roles SET role='client' WHERE user_id='{uid}'" if demotion
                        else f"DELETE FROM public.user_roles WHERE user_id='{uid}'")
                first = subprocess.Popen(prefix + ['psql', '-U', 'testadmin', '-h', str(temp), '-p', '55439', '-d', 'postgres',
                    '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c',
                    f"BEGIN ISOLATION LEVEL {isolation}; {action(A)}; SELECT pg_sleep(1); COMMIT;"],
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                # Wait for the first transaction to reach its sleep, not a timing guess.
                for _ in range(100):
                    sleeping = sql("SELECT count(*) FROM pg_stat_activity WHERE wait_event='PgSleep'").stdout.strip()
                    if sleeping == '1': break
                    time.sleep(.02)
                else: raise AssertionError('first transaction did not reach sleep')
                second = sql(f"BEGIN ISOLATION LEVEL {isolation}; {action(B)}; COMMIT;", check=False)
                first.communicate(timeout=10)
                assert first.returncode == 0
                remaining = sql("SELECT count(*) FROM public.user_roles WHERE role='admin'").stdout.strip()
                assert remaining == ('1' if protected else '0'), (protected, isolation, demotion, remaining, second.stderr)
                assert (second.returncode != 0) == protected
                print('PASS', 'protected' if protected else 'race reproduced', isolation, 'demotion' if demotion else 'delete')
    print('PASS registration stays client, existing admin preserved, last admin protected, migration repeatable')
finally:
    if started:
        command('pg_ctl', '-D', str(temp / 'data'), '-m', 'immediate', '-w', 'stop')
    shutil.rmtree(temp)