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