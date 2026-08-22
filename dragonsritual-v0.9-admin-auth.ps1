$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v0.9 - Supabase Auth + Owner Admin Gate ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "src\pages\admin\index.astro")) {
    throw "STOPPED: v0.8 Admin Shell was not found."
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-NoBom {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )

    $fullPath = Join-Path (Get-Location) $Path
    $parent = Split-Path -Parent $fullPath

    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    [System.IO.File]::WriteAllText($fullPath, $Content, $Utf8NoBom)
}

# ------------------------------------------------------------
# 1) BACKUP
# ------------------------------------------------------------
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path (Get-Location) ".migration-backups\v0.9-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$targets = @(
    "src\pages\admin\index.astro",
    "src\styles\admin.css",
    "src\lib\supabaseBrowser.ts"
)

foreach ($file in $targets) {
    if (Test-Path $file) {
        $dest = Join-Path $backupDir $file
        $destParent = Split-Path -Parent $dest
        if ($destParent) {
            New-Item -ItemType Directory -Force -Path $destParent | Out-Null
        }
        Copy-Item $file $dest -Force
    }
}

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $backupDir -ForegroundColor Yellow

# ------------------------------------------------------------
# 2) ADMIN AUTH / RLS MIGRATION
# ------------------------------------------------------------
Write-NoBom "supabase\migrations\202608070004_admin_auth.sql" @'
-- DragonsRitual v0.9
-- Owner/admin authorization foundation.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

grant usage on schema public to authenticated;
grant select on table public.admin_users to authenticated;

-- Authenticated users may only see whether THEY are an admin.
drop policy if exists "users read own admin membership" on public.admin_users;
create policy "users read own admin membership"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

-- Secure helper used by future write policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Authenticated clients may attempt updates, but RLS below permits
-- them only when public.is_admin() is true.
grant update on table public.games to authenticated;

drop policy if exists "admins update games" on public.games;
create policy "admins update games"
on public.games
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Sessions are prepared for the next editor pass.
grant insert, update, delete on table public.sessions to authenticated;

drop policy if exists "admins insert sessions" on public.sessions;
create policy "admins insert sessions"
on public.sessions
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins update sessions" on public.sessions;
create policy "admins update sessions"
on public.sessions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins delete sessions" on public.sessions;
create policy "admins delete sessions"
on public.sessions
for delete
to authenticated
using (public.is_admin());

-- IMPORTANT:
-- No browser/client is allowed to add itself to admin_users.
-- The initial owner is bootstrapped manually in the Supabase SQL Editor.
'@

# ------------------------------------------------------------
# 3) BROWSER SUPABASE CLIENT
# ------------------------------------------------------------
Write-NoBom "src\lib\supabaseBrowser.ts" @'
import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase browser configuration is missing. Check .env.local."
    );
  }

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return browserClient;
}
'@

# ------------------------------------------------------------
# 4) ADMIN PAGE - CLIENT AUTH GATE + LIVE DATABASE READ
# ------------------------------------------------------------
Write-NoBom "src\pages\admin\index.astro" @'
---
import AdminLayout from "../../layouts/AdminLayout.astro";
---

<AdminLayout title="DragonsRitual Control Room">
  <div class="admin-auth-page">
    <section id="admin-login" class="admin-login-card">
      <div class="admin-login-brand">
        <span class="admin-brand__mark">DR</span>
        <div>
          <span>DRAGONSRITUAL</span>
          <h1>Control Room</h1>
        </div>
      </div>

      <p>
        Owner access. Sign in with the Supabase account authorized for
        DragonsRitual administration.
      </p>

      <form id="admin-login-form" class="admin-login-form">
        <label>
          <span>Email</span>
          <input
            id="admin-email"
            name="email"
            type="email"
            autocomplete="email"
            required
          />
        </label>

        <label>
          <span>Password</span>
          <input
            id="admin-password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>

        <button id="admin-login-button" type="submit">
          Sign In
        </button>
      </form>

      <div id="admin-login-message" class="admin-login-message" aria-live="polite"></div>

      <a class="admin-public-link" href="/">← Return to Public Gaming</a>
    </section>

    <section id="admin-unauthorized" class="admin-login-card" hidden>
      <span class="admin-auth-kicker">SIGNED IN / NOT AUTHORIZED</span>
      <h1>Owner access required.</h1>
      <p>
        This Supabase account is valid, but it is not listed in
        <code>admin_users</code>.
      </p>

      <div class="admin-auth-actions">
        <button id="admin-copy-user-id" type="button">Copy My User ID</button>
        <button id="admin-unauthorized-logout" type="button">Sign Out</button>
      </div>

      <div id="admin-user-id" class="admin-user-id"></div>
    </section>

    <div id="admin-app" class="admin-shell" hidden>
      <aside class="admin-rail">
        <a class="admin-brand" href="/admin/">
          <span class="admin-brand__mark">DR</span>
          <span>
            <strong>CONTROL ROOM</strong>
            <small>DRAGONSRITUAL</small>
          </span>
        </a>

        <div class="admin-rail__label">ADMIN</div>

        <nav class="admin-nav" aria-label="Admin navigation">
          <a class="is-active" href="/admin/">
            <span>01</span>
            <strong>Overview</strong>
          </a>

          <button type="button" disabled>
            <span>02</span>
            <strong>Games</strong>
            <em>EDITOR NEXT</em>
          </button>

          <button type="button" disabled>
            <span>03</span>
            <strong>Sessions</strong>
            <em>EDITOR NEXT</em>
          </button>

          <button type="button" disabled>
            <span>04</span>
            <strong>Schedule</strong>
            <em>EDITOR NEXT</em>
          </button>

          <button type="button" disabled>
            <span>05</span>
            <strong>Media</strong>
            <em>LATER</em>
          </button>

          <button type="button" disabled>
            <span>06</span>
            <strong>Newsroom</strong>
            <em>LATER</em>
          </button>
        </nav>

        <div class="admin-rail__bottom">
          <button id="admin-logout" class="admin-logout" type="button">Sign Out</button>
          <a href="/">← Public Gaming</a>
          <small>OWNER GATE v0.9</small>
        </div>
      </aside>

      <main class="admin-main">
        <header class="admin-topbar">
          <div>
            <span>DRAGONSRITUAL / OWNER</span>
            <h1>Control Room</h1>
          </div>

          <div class="admin-status">
            <span class="admin-status__dot is-live"></span>
            <div>
              <strong>AUTHORIZED</strong>
              <small id="admin-owner-email">OWNER SESSION</small>
            </div>
          </div>
        </header>

        <section class="admin-warning admin-warning--secure">
          <strong>OWNER SESSION ACTIVE</strong>
          <p>
            Supabase Auth and admin membership are verified before this
            interface is shown. Database mutations remain limited by RLS.
          </p>
        </section>

        <section class="admin-metrics">
          <article>
            <span>DATABASE</span>
            <strong>ONLINE</strong>
            <small>Supabase / PostgreSQL</small>
          </article>

          <article>
            <span>GAMES</span>
            <strong id="metric-games">—</strong>
            <small id="metric-active-games">Loading</small>
          </article>

          <article>
            <span>SESSIONS</span>
            <strong id="metric-sessions">—</strong>
            <small>Season total</small>
          </article>

          <article>
            <span>HOURS</span>
            <strong id="metric-hours">—</strong>
            <small>Logged play time</small>
          </article>
        </section>

        <section class="admin-grid">
          <article class="admin-panel admin-panel--wide">
            <header class="admin-panel__header">
              <div>
                <span>LIVE DATABASE</span>
                <h2>Game Records</h2>
              </div>

              <span class="admin-readonly">AUTHENTICATED</span>
            </header>

            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Status</th>
                    <th>Sessions</th>
                    <th>Hours</th>
                    <th>Progress</th>
                    <th>Last Played</th>
                    <th>Current Result</th>
                  </tr>
                </thead>
                <tbody id="admin-games-body">
                  <tr>
                    <td colspan="7">Loading live records…</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="admin-panel">
            <header class="admin-panel__header">
              <div>
                <span>SECURITY</span>
                <h2>Access State</h2>
              </div>
            </header>

            <dl class="admin-system-list">
              <div><dt>Authentication</dt><dd>Supabase Auth</dd></div>
              <div><dt>Authorization</dt><dd>admin_users</dd></div>
              <div><dt>Database writes</dt><dd>RLS protected</dd></div>
              <div><dt>Admin route</dt><dd>Client gated</dd></div>
              <div><dt>Secrets in browser</dt><dd>None</dd></div>
            </dl>
          </article>

          <article class="admin-panel">
            <header class="admin-panel__header">
              <div>
                <span>NEXT SYSTEM</span>
                <h2>Game Editor</h2>
              </div>
            </header>

            <div class="admin-next">
              <span class="admin-next__number">v1.0</span>
              <h3>Real Controls</h3>
              <p>
                Edit progress, hours, status, current objective, create sessions,
                and schedule upcoming play directly from DragonsRitual.
              </p>
            </div>
          </article>
        </section>
      </main>
    </div>
  </div>

  <script>
    import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

    const supabase = getSupabaseBrowserClient();

    const login = document.querySelector("#admin-login");
    const unauthorized = document.querySelector("#admin-unauthorized");
    const app = document.querySelector("#admin-app");

    const form = document.querySelector("#admin-login-form");
    const emailInput = document.querySelector("#admin-email");
    const passwordInput = document.querySelector("#admin-password");
    const loginButton = document.querySelector("#admin-login-button");
    const message = document.querySelector("#admin-login-message");

    const ownerEmail = document.querySelector("#admin-owner-email");
    const userIdBox = document.querySelector("#admin-user-id");

    function showLogin() {
      login?.removeAttribute("hidden");
      unauthorized?.setAttribute("hidden", "");
      app?.setAttribute("hidden", "");
    }

    function showUnauthorized(user) {
      login?.setAttribute("hidden", "");
      app?.setAttribute("hidden", "");
      unauthorized?.removeAttribute("hidden");

      if (userIdBox) {
        userIdBox.textContent = user.id;
      }
    }

    async function isAdmin(userId) {
      const { data, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error(error);
        return false;
      }

      return Boolean(data);
    }

    function formatDate(value) {
      if (!value) return "—";

      const date = new Date(`${value}T12:00:00`);
      if (Number.isNaN(date.getTime())) return value;

      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric"
      }).format(date);
    }

    async function loadControlRoom(user) {
      login?.setAttribute("hidden", "");
      unauthorized?.setAttribute("hidden", "");
      app?.removeAttribute("hidden");

      if (ownerEmail) ownerEmail.textContent = user.email ?? "OWNER SESSION";

      const [{ data: games, error: gamesError }, { data: platforms, error: platformsError }] =
        await Promise.all([
          supabase
            .from("games")
            .select(`
              id,
              title,
              platform_id,
              status,
              session_count,
              hours_played,
              progress_percent,
              last_played_at,
              current_objective
            `)
            .order("title"),

          supabase
            .from("platforms")
            .select("id,name")
        ]);

      if (gamesError) throw gamesError;
      if (platformsError) throw platformsError;

      const platformMap = new Map(
        (platforms ?? []).map((platform) => [platform.id, platform.name])
      );

      const rows = games ?? [];

      const totalSessions = rows.reduce(
        (sum, game) => sum + Number(game.session_count ?? 0),
        0
      );

      const totalHours = rows.reduce(
        (sum, game) => sum + Number(game.hours_played ?? 0),
        0
      );

      const activeGames = rows.filter((game) => game.status === "active").length;

      const metricGames = document.querySelector("#metric-games");
      const metricActiveGames = document.querySelector("#metric-active-games");
      const metricSessions = document.querySelector("#metric-sessions");
      const metricHours = document.querySelector("#metric-hours");

      if (metricGames) metricGames.textContent = String(rows.length);
      if (metricActiveGames) metricActiveGames.textContent = `${activeGames} active`;
      if (metricSessions) metricSessions.textContent = String(totalSessions);
      if (metricHours) metricHours.textContent = totalHours.toFixed(1);

      const tbody = document.querySelector("#admin-games-body");

      if (tbody) {
        tbody.innerHTML = "";

        for (const game of rows) {
          const tr = document.createElement("tr");

          const platform = platformMap.get(game.platform_id) ?? "Unknown";
          const status =
            game.status.charAt(0).toUpperCase() + game.status.slice(1);

          const cells = [
            `${game.title}|||${platform}`,
            status,
            String(game.session_count ?? 0),
            String(game.hours_played ?? 0),
            `${game.progress_percent ?? 0}%`,
            formatDate(game.last_played_at),
            game.current_objective ?? "—"
          ];

          cells.forEach((value, index) => {
            const td = document.createElement("td");

            if (index === 0) {
              const [title, sub] = value.split("|||");
              const strong = document.createElement("strong");
              const small = document.createElement("small");
              strong.textContent = title;
              small.textContent = sub;
              td.append(strong, small);
            } else if (index === 1) {
              const pill = document.createElement("span");
              pill.className = "admin-pill";
              pill.textContent = value;
              td.appendChild(pill);
            } else {
              td.textContent = value;
            }

            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        }
      }
    }

    async function resolveSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        showLogin();
        return;
      }

      const allowed = await isAdmin(session.user.id);

      if (!allowed) {
        showUnauthorized(session.user);
        return;
      }

      await loadControlRoom(session.user);
    }

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = emailInput?.value?.trim();
      const password = passwordInput?.value ?? "";

      if (!email || !password) return;

      if (message) message.textContent = "Signing in…";
      if (loginButton) loginButton.disabled = true;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginButton) loginButton.disabled = false;

      if (error || !data.user) {
        if (message) {
          message.textContent = error?.message ?? "Unable to sign in.";
        }
        return;
      }

      if (message) message.textContent = "";

      const allowed = await isAdmin(data.user.id);

      if (!allowed) {
        showUnauthorized(data.user);
        return;
      }

      await loadControlRoom(data.user);
    });

    async function logout() {
      await supabase.auth.signOut();
      location.reload();
    }

    document.querySelector("#admin-logout")
      ?.addEventListener("click", logout);

    document.querySelector("#admin-unauthorized-logout")
      ?.addEventListener("click", logout);

    document.querySelector("#admin-copy-user-id")
      ?.addEventListener("click", async () => {
        const value = userIdBox?.textContent ?? "";
        if (!value) return;

        await navigator.clipboard.writeText(value);

        const button = document.querySelector("#admin-copy-user-id");
        if (button) button.textContent = "Copied";
      });

    resolveSession().catch((error) => {
      console.error(error);

      if (message) {
        message.textContent =
          error instanceof Error ? error.message : "Admin failed to load.";
      }

      showLogin();
    });
  </script>
</AdminLayout>
'@

# ------------------------------------------------------------
# 5) AUTH STYLES
# ------------------------------------------------------------
Add-Content -Encoding UTF8 "src\styles\admin.css" @'

/* ---------------------------------------------------------------
   v0.9 AUTH / OWNER GATE
---------------------------------------------------------------- */

.admin-auth-page {
  min-height: 100vh;
}

.admin-login-card {
  width: min(470px, calc(100% - 32px));
  margin: 10vh auto 0;
  padding: 28px;

  border: 1px solid var(--line);
  background: rgba(17,19,25,.96);
  box-shadow: 0 28px 80px rgba(0,0,0,.28);
}

.admin-login-card[hidden],
.admin-shell[hidden] {
  display: none !important;
}

.admin-login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.admin-login-brand > div > span,
.admin-auth-kicker {
  color: var(--accent);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .18em;
}

.admin-login-card h1 {
  margin: 6px 0 0;
  font: 700 34px/1 Georgia, serif;
}

.admin-login-card > p {
  margin: 22px 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

.admin-login-form {
  display: grid;
  gap: 14px;
}

.admin-login-form label {
  display: grid;
  gap: 7px;
}

.admin-login-form label span {
  color: #858c98;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.admin-login-form input {
  width: 100%;
  height: 45px;
  padding: 0 12px;

  border: 1px solid var(--line);
  outline: none;

  background: #090a0e;
  color: var(--text);
}

.admin-login-form input:focus {
  border-color: rgba(231,189,79,.65);
}

.admin-login-form button,
.admin-auth-actions button {
  min-height: 43px;
  border: 1px solid rgba(231,189,79,.45);
  background: rgba(231,189,79,.08);
  color: var(--accent);

  font-size: 9px;
  font-weight: 900;
  letter-spacing: .1em;
  text-transform: uppercase;
  cursor: pointer;
}

.admin-login-form button:disabled {
  opacity: .55;
  cursor: wait;
}

.admin-login-message {
  min-height: 20px;
  margin-top: 12px;
  color: #dc8181;
  font-size: 10px;
}

.admin-public-link {
  display: inline-block;
  margin-top: 14px;
  color: #7b828e;
  font-size: 9px;
}

.admin-user-id {
  margin-top: 16px;
  padding: 11px;

  border: 1px solid var(--line);
  background: #090a0e;
  color: #949ba7;

  font: 9px/1.5 ui-monospace, monospace;
  word-break: break-all;
}

.admin-auth-actions {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.admin-logout {
  width: 100%;
  min-height: 30px;

  border: 1px solid var(--line);
  background: transparent;
  color: #8d949f;

  font-size: 8px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
}

.admin-logout:hover {
  border-color: rgba(231,189,79,.35);
  color: var(--accent);
}

.admin-warning--secure {
  border-color: rgba(118,198,140,.22);
  background: rgba(118,198,140,.035);
}

.admin-warning--secure strong {
  color: #84c995;
}
'@

# ------------------------------------------------------------
# 6) OWNER BOOTSTRAP TEMPLATE
# ------------------------------------------------------------
Write-NoBom "supabase\seed\bootstrap-owner.sql" @'
-- Run this ONLY after you create your owner user in Supabase Auth.
--
-- Replace YOUR_OWNER_EMAIL@example.com with your actual Supabase Auth email.
-- Then run this query in the Supabase SQL Editor.
--
-- Do not commit a modified copy containing a private email if you do not
-- want that email stored in Git history.

insert into public.admin_users (user_id)
select id
from auth.users
where email = 'YOUR_OWNER_EMAIL@example.com'
on conflict (user_id) do nothing;

select
  au.user_id,
  u.email,
  au.created_at
from public.admin_users au
join auth.users u on u.id = au.user_id;
'@

# ------------------------------------------------------------
# 7) BUILD
# ------------------------------------------------------------
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v0.9 AUTH FOUNDATION COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Created:" -ForegroundColor Cyan
Write-Host "  Supabase Auth login screen" -ForegroundColor White
Write-Host "  admin_users authorization gate" -ForegroundColor White
Write-Host "  Owner-only RLS helper" -ForegroundColor White
Write-Host "  Secure future write policies" -ForegroundColor White
Write-Host "  Client-side live admin data loading" -ForegroundColor White
Write-Host "  Owner bootstrap SQL template" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "The new SQL migration has NOT been applied to Supabase yet." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Apply supabase/migrations/202608070004_admin_auth.sql" -ForegroundColor White
Write-Host "2. Create your owner user in Supabase Authentication" -ForegroundColor White
Write-Host "3. Bootstrap that user into admin_users" -ForegroundColor White
Write-Host "4. Start npm run dev and sign in at /admin/" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Green
