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