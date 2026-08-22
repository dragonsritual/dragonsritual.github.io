$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v1.4 - Sanity Newsroom Foundation ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside dragonsritual.github.io."
}

if (-not (Test-Path "src\pages\admin\media.astro")) {
    throw "STOPPED: v1.3 Media Library was not found."
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

function Append-Line-IfMissing {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Needle,
        [Parameter(Mandatory=$true)][string]$Line
    )

    if (-not (Test-Path $Path)) {
        Write-NoBom $Path ($Line + [Environment]::NewLine)
        return
    }

    $content = Get-Content $Path -Raw
    if ($content -notmatch [regex]::Escape($Needle)) {
        Add-Content -Path $Path -Value $Line -Encoding UTF8
    }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path (Get-Location) ".migration-backups\v1.4-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

foreach ($file in @(
    "package.json",
    "package-lock.json",
    ".env.local",
    "sanity.config.ts",
    "sanity.cli.ts",
    "src\pages\admin\index.astro",
    "src\pages\admin\games.astro",
    "src\pages\admin\sessions.astro",
    "src\pages\admin\schedule.astro",
    "src\pages\admin\media.astro"
)) {
    if (Test-Path $file) {
        $dest = Join-Path $backupDir $file
        $parent = Split-Path -Parent $dest
        if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
        Copy-Item $file $dest -Force
    }
}

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $backupDir -ForegroundColor Yellow

# ------------------------------------------------------------
# 1) INSTALL SANITY STUDIO DEPENDENCIES
# ------------------------------------------------------------
npm install sanity @sanity/client @sanity/vision

# Add scripts without replacing the rest of package.json.
npm pkg set scripts.newsroom="sanity dev"
npm pkg set scripts."newsroom:build"="sanity build"
npm pkg set scripts."newsroom:deploy"="sanity deploy"

# ------------------------------------------------------------
# 2) ENVIRONMENT
# Project ID and dataset are public identifiers, NOT secrets.
# ------------------------------------------------------------
Append-Line-IfMissing ".env.local" "PUBLIC_SANITY_PROJECT_ID=" "PUBLIC_SANITY_PROJECT_ID=5dooc6p7"
Append-Line-IfMissing ".env.local" "PUBLIC_SANITY_DATASET=" "PUBLIC_SANITY_DATASET=production"

Append-Line-IfMissing ".env.example" "PUBLIC_SANITY_PROJECT_ID=" "PUBLIC_SANITY_PROJECT_ID=YOUR_SANITY_PROJECT_ID"
Append-Line-IfMissing ".env.example" "PUBLIC_SANITY_DATASET=" "PUBLIC_SANITY_DATASET=production"

# ------------------------------------------------------------
# 3) SANITY CLI CONFIG
# ------------------------------------------------------------
Write-NoBom "sanity.cli.ts" @'
import {defineCliConfig} from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: "5dooc6p7",
    dataset: "production"
  }
});
'@

# ------------------------------------------------------------
# 4) SCHEMA TYPES
# ------------------------------------------------------------
Write-NoBom "sanity\schemaTypes\author.ts" @'
import {defineField, defineType} from "sanity";

export const authorType = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Display Name",
      type: "string",
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {source: "name"},
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 4
    })
  ],
  preview: {
    select: {title: "name"}
  }
});
'@

Write-NoBom "sanity\schemaTypes\category.ts" @'
import {defineField, defineType} from "sanity";

export const categoryType = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {source: "title"},
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3
    })
  ]
});
'@

Write-NoBom "sanity\schemaTypes\tag.ts" @'
import {defineField, defineType} from "sanity";

export const tagType = defineType({
  name: "tag",
  title: "Tag",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {source: "title"},
      validation: (rule) => rule.required()
    })
  ]
});
'@

Write-NoBom "sanity\schemaTypes\externalMedia.ts" @'
import {defineField, defineType} from "sanity";

export const externalMediaType = defineType({
  name: "externalMedia",
  title: "DragonsRitual Media",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "Media URL",
      description:
        "Use a public URL from the DragonsRitual Media Library / Supabase Storage.",
      type: "url",
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "alt",
      title: "Alt Text",
      type: "string"
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string"
    }),
    defineField({
      name: "supabaseMediaId",
      title: "Supabase Media ID",
      description:
        "Optional relationship to the canonical media record in PostgreSQL.",
      type: "string"
    })
  ],
  preview: {
    select: {
      title: "caption",
      subtitle: "url"
    },
    prepare({title, subtitle}) {
      return {
        title: title || "DragonsRitual Media",
        subtitle
      };
    }
  }
});
'@

Write-NoBom "sanity\schemaTypes\article.ts" @'
import {defineArrayMember, defineField, defineType} from "sanity";

export const articleType = defineType({
  name: "article",
  title: "Article",
  type: "document",
  groups: [
    {name: "editorial", title: "Editorial", default: true},
    {name: "relations", title: "DragonsRitual Relations"},
    {name: "seo", title: "SEO"}
  ],
  fields: [
    defineField({
      name: "title",
      title: "Headline",
      type: "string",
      group: "editorial",
      validation: (rule) => rule.required().min(3).max(140)
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "editorial",
      options: {
        source: "title",
        maxLength: 96
      },
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "subtitle",
      title: "Deck / Subtitle",
      type: "string",
      group: "editorial",
      validation: (rule) => rule.max(220)
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 4,
      group: "editorial",
      validation: (rule) => rule.max(400)
    }),
    defineField({
      name: "status",
      title: "Editorial Status",
      type: "string",
      group: "editorial",
      initialValue: "draft",
      options: {
        list: [
          {title: "Draft", value: "draft"},
          {title: "Review", value: "review"},
          {title: "Scheduled", value: "scheduled"},
          {title: "Published", value: "published"},
          {title: "Archived", value: "archived"}
        ],
        layout: "radio"
      },
      validation: (rule) => rule.required()
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      group: "editorial"
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{type: "author"}],
      group: "editorial"
    }),
    defineField({
      name: "categories",
      title: "Categories",
      type: "array",
      group: "editorial",
      of: [{type: "reference", to: [{type: "category"}]}]
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      group: "editorial",
      of: [{type: "reference", to: [{type: "tag"}]}]
    }),
    defineField({
      name: "heroMedia",
      title: "Hero Media",
      type: "externalMedia",
      group: "editorial"
    }),
    defineField({
      name: "body",
      title: "Article Body",
      type: "array",
      group: "editorial",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            {title: "Normal", value: "normal"},
            {title: "Heading 2", value: "h2"},
            {title: "Heading 3", value: "h3"},
            {title: "Quote", value: "blockquote"}
          ]
        }),
        defineArrayMember({
          type: "externalMedia"
        })
      ],
      validation: (rule) => rule.required()
    }),

    defineField({
      name: "supabaseGameId",
      title: "Related Game ID",
      description:
        "Canonical PostgreSQL games.id. Later this becomes a live selector.",
      type: "string",
      group: "relations"
    }),
    defineField({
      name: "supabaseSessionId",
      title: "Related Session ID",
      description:
        "Canonical PostgreSQL sessions.id. Later this becomes a live selector.",
      type: "string",
      group: "relations"
    }),
    defineField({
      name: "supabaseWorldLocationId",
      title: "Related World Location ID",
      description:
        "Reserved for articles that deep-link into DragonsRitual Realms.",
      type: "string",
      group: "relations"
    }),

    defineField({
      name: "seoTitle",
      title: "SEO Title",
      type: "string",
      group: "seo",
      validation: (rule) => rule.max(70)
    }),
    defineField({
      name: "seoDescription",
      title: "SEO Description",
      type: "text",
      rows: 3,
      group: "seo",
      validation: (rule) => rule.max(170)
    }),
    defineField({
      name: "canonicalUrl",
      title: "Canonical URL Override",
      type: "url",
      group: "seo"
    }),
    defineField({
      name: "noIndex",
      title: "Prevent Search Indexing",
      type: "boolean",
      initialValue: false,
      group: "seo"
    })
  ],
  orderings: [
    {
      title: "Newest Published",
      name: "publishedAtDesc",
      by: [{field: "publishedAt", direction: "desc"}]
    }
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "status"
    },
    prepare({title, subtitle}) {
      return {
        title,
        subtitle: subtitle ? subtitle.toUpperCase() : "DRAFT"
      };
    }
  }
});
'@

Write-NoBom "sanity\schemaTypes\index.ts" @'
import {articleType} from "./article";
import {authorType} from "./author";
import {categoryType} from "./category";
import {externalMediaType} from "./externalMedia";
import {tagType} from "./tag";

export const schemaTypes = [
  articleType,
  authorType,
  categoryType,
  tagType,
  externalMediaType
];
'@

# ------------------------------------------------------------
# 5) SANITY STUDIO CONFIG
# ------------------------------------------------------------
Write-NoBom "sanity.config.ts" @'
import {defineConfig} from "sanity";
import {structureTool} from "sanity/structure";
import {visionTool} from "@sanity/vision";
import {schemaTypes} from "./sanity/schemaTypes";

export default defineConfig({
  name: "dragonsritual-newsroom",
  title: "DragonsRitual Newsroom",
  projectId: "5dooc6p7",
  dataset: "production",
  plugins: [
    structureTool(),
    visionTool()
  ],
  schema: {
    types: schemaTypes
  }
});
'@

# ------------------------------------------------------------
# 6) PUBLIC READ CLIENT FOR ASTRO
# ------------------------------------------------------------
Write-NoBom "src\lib\sanity.ts" @'
import {createClient} from "@sanity/client";

const projectId =
  import.meta.env.PUBLIC_SANITY_PROJECT_ID || "5dooc6p7";

const dataset =
  import.meta.env.PUBLIC_SANITY_DATASET || "production";

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: "2026-03-01",
  useCdn: false
});
'@

Write-NoBom "src\services\journal\index.ts" @'
import {sanityClient} from "../../lib/sanity";

export interface NewsroomArticleSummary {
  _id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  publishedAt: string | null;
  status: string;
  authorName: string | null;
  heroMediaUrl: string | null;
  heroMediaAlt: string | null;
  supabaseGameId: string | null;
  supabaseSessionId: string | null;
}

export async function listPublishedArticles(): Promise<NewsroomArticleSummary[]> {
  return sanityClient.fetch(
    `*[
      _type == "article" &&
      status == "published" &&
      defined(slug.current)
    ] | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      subtitle,
      excerpt,
      publishedAt,
      status,
      "authorName": author->name,
      "heroMediaUrl": heroMedia.url,
      "heroMediaAlt": heroMedia.alt,
      supabaseGameId,
      supabaseSessionId
    }`
  );
}

export async function getPublishedArticle(slug: string) {
  return sanityClient.fetch(
    `*[
      _type == "article" &&
      status == "published" &&
      slug.current == $slug
    ][0] {
      _id,
      title,
      "slug": slug.current,
      subtitle,
      excerpt,
      publishedAt,
      status,
      "authorName": author->name,
      categories[]->{title, "slug": slug.current},
      tags[]->{title, "slug": slug.current},
      heroMedia,
      body,
      supabaseGameId,
      supabaseSessionId,
      supabaseWorldLocationId,
      seoTitle,
      seoDescription,
      canonicalUrl,
      noIndex
    }`,
    {slug}
  );
}
'@

# ------------------------------------------------------------
# 7) CONTROL ROOM NEWSROOM LAUNCHER
# ------------------------------------------------------------
Write-NoBom "src\pages\admin\newsroom.astro" @'
---
import AdminLayout from "../../layouts/AdminLayout.astro";
---

<AdminLayout title="Newsroom — DragonsRitual">
  <div class="newsroom-launcher">
    <span>DRAGONSRITUAL / EDITORIAL</span>
    <h1>Newsroom</h1>

    <p>
      Sanity is the editorial publishing system for DragonsRitual.
      The Studio runs separately during development so the public Astro
      application and editorial environment remain cleanly separated.
    </p>

    <div class="newsroom-command">
      <small>FROM THE PROJECT TERMINAL</small>
      <code>npm run newsroom</code>
    </div>

    <p>
      Then open <strong>http://localhost:3333</strong>. Sign in with the
      Sanity account that owns the DragonsRitual organization.
    </p>

    <div class="admin-auth-actions">
      <a class="admin-primary-button admin-button-link" href="/admin/">
        ← Control Room
      </a>
      <a class="admin-secondary-button admin-button-link" href="/">
        Public Gaming
      </a>
    </div>
  </div>
</AdminLayout>
'@

# ------------------------------------------------------------
# 8) TURN NEWSROOM NAV LIVE EVERYWHERE
# ------------------------------------------------------------
foreach ($page in @(
    "src\pages\admin\index.astro",
    "src\pages\admin\games.astro",
    "src\pages\admin\sessions.astro",
    "src\pages\admin\schedule.astro",
    "src\pages\admin\media.astro"
)) {
    if (-not (Test-Path $page)) { continue }

    $content = Get-Content $page -Raw

    $content = $content -replace '<button type="button" disabled>\s*<span>06</span>\s*<strong>Newsroom</strong>\s*<em>(LATER|NEXT)</em>\s*</button>', @'
<a href="/admin/newsroom/">
          <span>06</span>
          <strong>Newsroom</strong>
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
# 9) NEWSROOM LAUNCHER STYLES
# ------------------------------------------------------------
Add-Content -Encoding UTF8 "src\styles\admin.css" @'

/* ---------------------------------------------------------------
   v1.4 SANITY NEWSROOM
---------------------------------------------------------------- */

.newsroom-launcher {
  width: min(760px, calc(100% - 32px));
  margin: 10vh auto;
  padding: 34px;

  border: 1px solid var(--line);
  background: rgba(17,19,25,.96);
}

.newsroom-launcher > span {
  color: var(--accent);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .18em;
}

.newsroom-launcher h1 {
  margin: 9px 0 18px;
  font: 700 42px/1 Georgia, serif;
}

.newsroom-launcher p {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.75;
}

.newsroom-command {
  margin: 24px 0;
  padding: 18px;
  border: 1px solid rgba(231,189,79,.22);
  background: #090a0e;
}

.newsroom-command small,
.newsroom-command code {
  display: block;
}

.newsroom-command small {
  color: #707783;
  font-size: 7px;
  font-weight: 900;
  letter-spacing: .14em;
}

.newsroom-command code {
  margin-top: 9px;
  color: var(--accent);
  font-size: 14px;
}
'@

# ------------------------------------------------------------
# 10) DOCS
# ------------------------------------------------------------
Write-NoBom "docs\v1.4-newsroom-foundation.md" @'
# DragonsRitual Newsroom v1.4

Sanity project:

- Project ID: 5dooc6p7
- Project: DragonsRitual Newsroom
- Organization: DragonsRitual
- Dataset: production
- Visibility: public

## Responsibilities

Sanity owns editorial content:

- articles
- authors
- categories
- tags
- rich article body
- editorial state
- publishing date
- SEO metadata

Supabase remains canonical for:

- games
- sessions
- streams
- media records
- world locations
- user accounts
- statistics

Articles store relationship IDs back to PostgreSQL rather than copying
game/session records into the CMS.

## Start the Studio

Run:

`npm run newsroom`

Open:

`http://localhost:3333`

## Media architecture

Newsroom uses the existing DragonsRitual Media Library by URL and optional
Supabase media ID.

This prevents a second disconnected media catalog from becoming the
canonical source.

## Next

v1.5 builds the public `/journal/` and `/journal/[slug]` experience from
published Sanity documents.

The Journal remains absent from global public navigation until explicitly
enabled.
'@

# ------------------------------------------------------------
# 11) BUILD
# ------------------------------------------------------------
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "DRAGONSRITUAL v1.4 NEWSROOM FOUNDATION COMPLETE" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Sanity project: 5dooc6p7 / production" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Run: npm run newsroom" -ForegroundColor White
Write-Host "2. Open: http://localhost:3333" -ForegroundColor White
Write-Host "3. Sign into Sanity if requested." -ForegroundColor White
Write-Host "4. Verify Article / Author / Category / Tag appear." -ForegroundColor White
Write-Host ""
Write-Host "Astro remains separate: npm run dev -> http://localhost:4321" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Green
