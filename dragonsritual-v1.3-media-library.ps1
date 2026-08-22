$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v1.3 - Media Library ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "src\pages\admin\schedule.astro")) {
    throw "STOPPED: v1.2 Schedule was not found."
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

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path (Get-Location) ".migration-backups\v1.3-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

foreach ($file in @(
    "src\pages\admin\index.astro",
    "src\pages\admin\games.astro",
    "src\pages\admin\sessions.astro",
    "src\pages\admin\schedule.astro",
    "src\pages\admin\media.astro",
    "src\styles\admin.css"
)) {
    if (Test-Path $file) {
        $dest = Join-Path $backupDir $file
        $parent = Split-Path -Parent $dest
        if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
        Copy-Item $file $dest -Force
    }
}

# ------------------------------------------------------------
# 1) DATABASE + STORAGE FOUNDATION
# ------------------------------------------------------------
Write-NoBom "supabase\migrations\202608070009_media_library.sql" @'
-- DragonsRitual v1.3
-- Media library + private owner upload bucket.

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'dragonsritual-media',
  'dragonsritual-media',
  true,
  52428800
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- Public visitors can view files from the public media bucket.
drop policy if exists "public read dragonsritual media objects" on storage.objects;
create policy "public read dragonsritual media objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'dragonsritual-media');

-- Only an authorized DragonsRitual admin may upload/update/delete.
drop policy if exists "admins insert dragonsritual media objects" on storage.objects;
create policy "admins insert dragonsritual media objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dragonsritual-media'
  and public.is_admin()
);

drop policy if exists "admins update dragonsritual media objects" on storage.objects;
create policy "admins update dragonsritual media objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'dragonsritual-media'
  and public.is_admin()
)
with check (
  bucket_id = 'dragonsritual-media'
  and public.is_admin()
);

drop policy if exists "admins delete dragonsritual media objects" on storage.objects;
create policy "admins delete dragonsritual media objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'dragonsritual-media'
  and public.is_admin()
);

grant select, insert, update on table public.media to authenticated;

drop policy if exists "admins insert media records" on public.media;
create policy "admins insert media records"
on public.media
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admins update media records" on public.media;
create policy "admins update media records"
on public.media
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No database-row DELETE yet. We keep records durable until the cleanup
-- workflow is intentionally designed.
'@

# ------------------------------------------------------------
# 2) MEDIA ADMIN PAGE
# ------------------------------------------------------------
Write-NoBom "src\pages\admin\media.astro" @'
---
import AdminLayout from "../../layouts/AdminLayout.astro";
---

<AdminLayout title="Media Library — DragonsRitual">
  <div id="media-auth-loading" class="admin-auth-loading">
    <span>DRAGONSRITUAL CONTROL ROOM</span>
    <strong>Loading media library…</strong>
  </div>

  <div id="media-denied" class="admin-login-card" hidden>
    <span class="admin-auth-kicker">ACCESS DENIED</span>
    <h1>Owner access required.</h1>
    <a class="admin-public-link" href="/admin/">← Return to Control Room</a>
  </div>

  <div id="media-app" class="admin-shell" hidden>
    <aside class="admin-rail">
      <a class="admin-brand" href="/admin/">
        <span class="admin-brand__mark">DR</span>
        <span><strong>CONTROL ROOM</strong><small>DRAGONSRITUAL</small></span>
      </a>

      <div class="admin-rail__label">ADMIN</div>

      <nav class="admin-nav">
        <a href="/admin/"><span>01</span><strong>Overview</strong></a>
        <a href="/admin/games/"><span>02</span><strong>Games</strong><em>LIVE</em></a>
        <a href="/admin/sessions/"><span>03</span><strong>Sessions</strong><em>LIVE</em></a>
        <a href="/admin/schedule/"><span>04</span><strong>Schedule</strong><em>LIVE</em></a>
        <a class="is-active" href="/admin/media/"><span>05</span><strong>Media</strong><em>LIVE</em></a>
        <button type="button" disabled><span>06</span><strong>Newsroom</strong><em>NEXT</em></button>
      </nav>

      <div class="admin-rail__bottom">
        <button id="media-logout" class="admin-logout" type="button">Sign Out</button>
        <a href="/">← Public Gaming</a>
        <small>MEDIA LIBRARY v1.3</small>
      </div>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <div>
          <span>DRAGONSRITUAL / ASSET SYSTEM</span>
          <h1>Media Library</h1>
        </div>
      </header>

      <section class="admin-warning admin-warning--secure">
        <strong>OWNER UPLOAD ACCESS</strong>
        <p>
          Upload screenshots and images once, then connect the same media record
          to games, sessions, and later Newsroom articles.
        </p>
      </section>

      <section class="media-admin-layout">
        <article class="admin-panel">
          <header class="admin-panel__header">
            <div><span>UPLOAD</span><h2>New Media</h2></div>
            <span id="media-upload-state" class="admin-readonly">READY</span>
          </header>

          <form id="media-upload-form" class="game-form">
            <div class="media-drop-field">
              <input id="media-file" type="file" accept="image/*,video/*,audio/*" required />
              <strong>Select media file</strong>
              <small>Images, clips, video, or audio. 50 MB maximum in this foundation.</small>
            </div>

            <div id="media-preview" class="media-upload-preview"></div>

            <div class="game-form-grid">
              <label class="game-form-field">
                <span>Title</span>
                <input id="media-title" type="text" />
              </label>

              <label class="game-form-field">
                <span>Type</span>
                <select id="media-type">
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="clip">Clip</option>
                  <option value="audio">Audio</option>
                </select>
              </label>

              <label class="game-form-field game-form-field--wide">
                <span>Alt Text</span>
                <input id="media-alt" type="text" placeholder="Describe the image for accessibility." />
              </label>

              <label class="game-form-field">
                <span>Game</span>
                <select id="media-game"><option value="">No game</option></select>
              </label>

              <label class="game-form-field">
                <span>Session</span>
                <select id="media-session"><option value="">No session</option></select>
              </label>
            </div>

            <div class="game-form-actions">
              <button class="admin-primary-button" type="submit">Upload Media</button>
              <span id="media-message" class="game-form-message" aria-live="polite"></span>
            </div>
          </form>
        </article>

        <article class="admin-panel">
          <header class="admin-panel__header">
            <div><span>LIBRARY</span><h2>Assets</h2></div>
            <span id="media-count" class="admin-readonly">0</span>
          </header>

          <div id="media-library" class="media-library-grid">
            <div class="game-admin-loading">Loading media…</div>
          </div>
        </article>
      </section>
    </main>
  </div>

  <script>
    import { requireAdmin } from "../../services/auth/adminGuard";

    const BUCKET = "dragonsritual-media";

    const loading = document.querySelector("#media-auth-loading");
    const denied = document.querySelector("#media-denied");
    const app = document.querySelector("#media-app");

    const form = document.querySelector("#media-upload-form");
    const fileInput = document.querySelector("#media-file");
    const titleInput = document.querySelector("#media-title");
    const typeInput = document.querySelector("#media-type");
    const altInput = document.querySelector("#media-alt");
    const gameInput = document.querySelector("#media-game");
    const sessionInput = document.querySelector("#media-session");
    const preview = document.querySelector("#media-preview");
    const message = document.querySelector("#media-message");
    const state = document.querySelector("#media-upload-state");
    const library = document.querySelector("#media-library");
    const count = document.querySelector("#media-count");

    let supabase;
    let games = [];
    let sessions = [];
    let media = [];

    function setMessage(text, type = "") {
      if (!message) return;
      message.textContent = text;
      message.dataset.type = type;
    }

    function setState(text) {
      if (state) state.textContent = text;
    }

    function safeFilename(name) {
      return name
        .normalize("NFKD")
        .replace(/[^\w.\-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    function inferType(file) {
      if (file.type.startsWith("image/")) return "image";
      if (file.type.startsWith("audio/")) return "audio";
      if (file.type.startsWith("video/")) return "video";
      return "clip";
    }

    function renderRelations() {
      if (gameInput) {
        gameInput.innerHTML = `<option value="">No game</option>`;
        for (const game of games) {
          const option = document.createElement("option");
          option.value = game.id;
          option.textContent = game.title;
          gameInput.appendChild(option);
        }
      }

      renderSessionOptions();
    }

    function renderSessionOptions() {
      if (!sessionInput) return;

      const selectedGame = gameInput?.value || "";
      sessionInput.innerHTML = `<option value="">No session</option>`;

      for (const session of sessions) {
        if (selectedGame && session.game_id !== selectedGame) continue;

        const option = document.createElement("option");
        option.value = session.id;
        option.textContent = session.title;
        sessionInput.appendChild(option);
      }
    }

    function renderMedia() {
      if (!library) return;

      library.innerHTML = "";
      if (count) count.textContent = String(media.length);

      if (media.length === 0) {
        library.innerHTML = `<div class="game-admin-loading">No uploaded media yet.</div>`;
        return;
      }

      for (const item of media) {
        const card = document.createElement("article");
        card.className = "media-card";

        const visual = document.createElement("div");
        visual.className = "media-card__visual";

        if (item.media_type === "image") {
          const img = document.createElement("img");
          img.src = item.url;
          img.alt = item.alt_text ?? "";
          img.loading = "lazy";
          visual.appendChild(img);
        } else {
          const fallback = document.createElement("span");
          fallback.textContent = item.media_type.toUpperCase();
          visual.appendChild(fallback);
        }

        const body = document.createElement("div");
        body.className = "media-card__body";

        const title = document.createElement("strong");
        title.textContent = item.title || "Untitled media";

        const meta = document.createElement("small");
        const game = games.find((g) => g.id === item.game_id)?.title;
        const session = sessions.find((s) => s.id === item.session_id)?.title;
        meta.textContent = [item.media_type, game, session].filter(Boolean).join(" · ");

        const link = document.createElement("a");
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = "OPEN →";

        body.append(title, meta, link);
        card.append(visual, body);
        library.appendChild(card);
      }
    }

    async function loadData() {
      const [gameResult, sessionResult, mediaResult] = await Promise.all([
        supabase.from("games").select("id,title").order("title"),
        supabase.from("sessions").select("id,game_id,title").order("created_at", { ascending: false }),
        supabase.from("media").select("*").order("created_at", { ascending: false })
      ]);

      if (gameResult.error) throw gameResult.error;
      if (sessionResult.error) throw sessionResult.error;
      if (mediaResult.error) throw mediaResult.error;

      games = gameResult.data ?? [];
      sessions = sessionResult.data ?? [];
      media = mediaResult.data ?? [];

      renderRelations();
      renderMedia();
    }

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (typeInput) typeInput.value = inferType(file);
      if (titleInput && !titleInput.value) {
        titleInput.value = file.name.replace(/\.[^.]+$/, "");
      }

      if (!preview) return;
      preview.innerHTML = "";

      if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = "";
        preview.appendChild(img);
      } else {
        const label = document.createElement("span");
        label.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        preview.appendChild(label);
      }
    });

    gameInput?.addEventListener("change", renderSessionOptions);

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const file = fileInput?.files?.[0];
      if (!file) {
        setMessage("Choose a file first.", "error");
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setMessage("File is larger than the 50 MB foundation limit.", "error");
        return;
      }

      setState("UPLOADING");
      setMessage("Uploading to Supabase Storage…");

      const path =
        `${new Date().getUTCFullYear()}/` +
        `${crypto.randomUUID()}-${safeFilename(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined
        });

      if (uploadError) {
        console.error(uploadError);
        setState("ERROR");
        setMessage(uploadError.message, "error");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      let width = null;
      let height = null;

      if (file.type.startsWith("image/")) {
        try {
          const dimensions = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({
              width: img.naturalWidth,
              height: img.naturalHeight
            });
            img.onerror = () => resolve({ width: null, height: null });
            img.src = URL.createObjectURL(file);
          });

          width = dimensions.width;
          height = dimensions.height;
        } catch {}
      }

      const { error: recordError } = await supabase
        .from("media")
        .insert({
          media_type: typeInput?.value ?? inferType(file),
          title: titleInput?.value?.trim() || null,
          alt_text: altInput?.value?.trim() || null,
          url: publicUrlData.publicUrl,
          width,
          height,
          game_id: gameInput?.value || null,
          session_id: sessionInput?.value || null
        });

      if (recordError) {
        console.error(recordError);
        setState("ERROR");
        setMessage(
          `File uploaded, but media record failed: ${recordError.message}`,
          "error"
        );
        return;
      }

      form.reset();
      if (preview) preview.innerHTML = "";
      setState("SAVED");
      setMessage("Media uploaded and cataloged.", "success");

      await loadData();
    });

    async function boot() {
      const auth = await requireAdmin();
      supabase = auth.supabase;

      loading?.setAttribute("hidden", "");

      if (!auth.ok) {
        denied?.removeAttribute("hidden");
        return;
      }

      app?.removeAttribute("hidden");
      await loadData();
    }

    document
      .querySelector("#media-logout")
      ?.addEventListener("click", async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        location.href = "/admin/";
      });

    boot().catch((error) => {
      console.error(error);
      loading?.setAttribute("hidden", "");
      denied?.removeAttribute("hidden");
    });
  </script>
</AdminLayout>
'@

# ------------------------------------------------------------
# 3) TURN MEDIA NAV LIVE EVERYWHERE
# ------------------------------------------------------------
foreach ($page in @(
    "src\pages\admin\index.astro",
    "src\pages\admin\games.astro",
    "src\pages\admin\sessions.astro",
    "src\pages\admin\schedule.astro"
)) {
    $content = Get-Content $page -Raw

    $content = $content -replace '<button type="button" disabled>\s*<span>05</span>\s*<strong>Media</strong>\s*<em>LATER</em>\s*</button>', @'
<a href="/admin/media/">
          <span>05</span>
          <strong>Media</strong>
          <em>LIVE</em>
        </a>
'@

    [System.IO.File]::WriteAllText(
        (Resolve-Path $page),
        $content,
        $Utf8NoBom
    )
}

# ------------------------------------------------------------
# 4) STYLES
# ------------------------------------------------------------
Add-Content -Encoding UTF8 "src\styles\admin.css" @'

/* ---------------------------------------------------------------
   v1.3 MEDIA LIBRARY
---------------------------------------------------------------- */

.media-admin-layout {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(380px, .75fr) minmax(500px, 1.25fr);
  gap: 12px;
}

.media-drop-field {
  min-height: 120px;
  padding: 20px;
  display: grid;
  place-items: center;
  gap: 6px;
  border: 1px dashed rgba(231,189,79,.32);
  background: rgba(231,189,79,.025);
  text-align: center;
}

.media-drop-field input {
  width: 100%;
}

.media-drop-field strong {
  font-size: 11px;
}

.media-drop-field small {
  color: var(--muted);
  font-size: 8px;
}

.media-upload-preview {
  margin: 14px 0;
  min-height: 20px;
}

.media-upload-preview img {
  display: block;
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
  border: 1px solid var(--line);
}

.media-upload-preview span {
  color: var(--muted);
  font-size: 9px;
}

.media-library-grid {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.media-card {
  min-width: 0;
  border: 1px solid var(--line);
  background: #0a0b0f;
}

.media-card__visual {
  aspect-ratio: 16 / 10;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #050609;
}

.media-card__visual img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-card__visual span {
  color: #6d7480;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .12em;
}

.media-card__body {
  padding: 11px;
}

.media-card__body strong,
.media-card__body small {
  display: block;
}

.media-card__body strong {
  font-size: 10px;
}

.media-card__body small {
  min-height: 24px;
  margin-top: 5px;
  color: var(--muted);
  font-size: 7px;
  line-height: 1.5;
}

.media-card__body a {
  display: inline-block;
  margin-top: 9px;
  color: var(--accent);
  font-size: 7px;
  font-weight: 900;
  letter-spacing: .08em;
}

@media (max-width: 1050px) {
  .media-admin-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .media-library-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
'@

# ------------------------------------------------------------
# 5) DOC
# ------------------------------------------------------------
Write-NoBom "docs\v1.3-media-library.md" @'
# DragonsRitual Media Library v1.3

Route:

`/admin/media/`

Foundation capabilities:

- owner-only authenticated upload
- Supabase Storage bucket: `dragonsritual-media`
- public delivery URLs for media intended for the public site
- media database record
- title
- alt text
- type
- dimensions for uploaded images
- optional Game relationship
- optional Session relationship
- library grid

The media system comes before Newsroom because articles should reference
one shared media library rather than creating a second disconnected upload
system.

Next:

v1.4 Newsroom / Sanity editorial foundation, using these media/game/session
relationships.
'@

npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v1.3 MEDIA LIBRARY COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "Apply migration 202608070009_media_library.sql before uploading." -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Apply migration #9 in Supabase SQL Editor." -ForegroundColor White
Write-Host "2. npm run dev" -ForegroundColor White
Write-Host "3. Open http://localhost:4321/admin/media/" -ForegroundColor White
Write-Host "4. Upload one test screenshot." -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor Green
