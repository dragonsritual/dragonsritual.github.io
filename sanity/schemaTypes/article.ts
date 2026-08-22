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