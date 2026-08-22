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

export interface NewsroomArticle extends NewsroomArticleSummary {
  categories: Array<{title: string; slug: string}>;
  tags: Array<{title: string; slug: string}>;
  heroMedia: {
    url?: string;
    alt?: string;
    caption?: string;
    supabaseMediaId?: string;
  } | null;
  body: unknown[];
  supabaseWorldLocationId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
}

const summaryProjection = `
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
`;

const fullProjection = `
  ${summaryProjection},
  categories[]->{title, "slug": slug.current},
  tags[]->{title, "slug": slug.current},
  heroMedia,
  body,
  supabaseWorldLocationId,
  seoTitle,
  seoDescription,
  canonicalUrl,
  noIndex
`;

export async function listPublishedArticles(): Promise<NewsroomArticleSummary[]> {
  return sanityClient.fetch(
    `*[
      _type == "article" &&
      status == "published" &&
      defined(slug.current)
    ] | order(publishedAt desc) {
      ${summaryProjection}
    }`
  );
}

export async function listPublishedArticleDocuments(): Promise<NewsroomArticle[]> {
  return sanityClient.fetch(
    `*[
      _type == "article" &&
      status == "published" &&
      defined(slug.current)
    ] | order(publishedAt desc) {
      ${fullProjection}
    }`
  );
}

export async function getPublishedArticle(slug: string): Promise<NewsroomArticle | null> {
  return sanityClient.fetch(
    `*[
      _type == "article" &&
      status == "published" &&
      slug.current == $slug
    ][0] {
      ${fullProjection}
    }`,
    {slug}
  );
}
