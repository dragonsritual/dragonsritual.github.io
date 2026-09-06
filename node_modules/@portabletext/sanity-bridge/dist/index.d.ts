import { ArrayDefinition, ArraySchemaType, BlockDecoratorDefinition, BlockListDefinition, BlockStyleDefinition, ObjectSchemaType, Path, PortableTextBlock } from "@sanity/types";
import { Schema } from "@portabletext/schema";
/**
 * @public
 * Sanity-specific schema types for Portable Text.
 */
type PortableTextMemberSchemaTypes = {
  annotations: (ObjectSchemaType & {
    i18nTitleKey?: string;
  })[];
  block: ObjectSchemaType;
  blockObjects: ObjectSchemaType[];
  decorators: BlockDecoratorDefinition[];
  inlineObjects: ObjectSchemaType[];
  portableText: ArraySchemaType<PortableTextBlock>;
  span: ObjectSchemaType;
  styles: BlockStyleDefinition[];
  lists: BlockListDefinition[];
};
/**
 * @public
 * Create Sanity-specific schema types for Portable Text from a Sanity array
 * schema type.
 */
declare function createPortableTextMemberSchemaTypes(portableTextType: ArraySchemaType<PortableTextBlock>): PortableTextMemberSchemaTypes;
/**
 * Resolve the {@link PortableTextMemberSchemaTypes} view at `path`
 * against `value`. Walks `path` to find the nearest Portable-Text-
 * shaped ancestor — a container's child array, or the root — and
 * bucketizes its `of` declaration into the same shape as
 * {@link createPortableTextMemberSchemaTypes}.
 *
 * Sanity-side counterpart to `@portabletext/schema`'s `getSubSchema`,
 * composed with the same walk that PTE's `getPathSubSchema` performs.
 * The two functions answer the same question — "what's the schema
 * here?" — in their respective type universes: `@portabletext/schema`
 * operates over the PTE `Schema` shape; this one over Sanity's
 * `SchemaType`. Same algorithm, different inputs.
 *
 * The walk is structured against the raw Sanity `ArraySchemaType` and
 * value tree directly, without consulting PTE's runtime `Containers`
 * map, so it can run from anywhere a Studio integration sits.
 *
 * A "Portable-Text-shaped" `of` is an array declaration that includes
 * a `{type: 'block'}` member. Text blocks' `children` field carries a
 * span-content `of` (no block member) and is not Portable-Text-shaped;
 * descending into it would not yield a `PortableTextMemberSchemaTypes`
 * view. The walk therefore tracks the deepest PT-shaped `of` it has
 * traversed and returns its bucketization. When `path` traverses no
 * containers (or is empty), returns the root bucketization.
 *
 * Falls back to the root bucketization when:
 * - `path` traverses only text blocks and their span children,
 * - any segment along the walk can't be resolved against the value, or
 * - any member along the walk has no child array field.
 *
 * @public
 */
declare function getSanitySubSchema(rootPortableTextType: ArraySchemaType<PortableTextBlock>, value: ReadonlyArray<PortableTextBlock>, path: Path): PortableTextMemberSchemaTypes;
/**
 * @public
 * Compile a Sanity schema to a Portable Text `Schema`.
 *
 * A Portable Text `Schema` is compatible with a Portable Text
 * `SchemaDefinition` and can be used as configuration for the Portable Text
 * Editor.
 *
 * @example
 * ```tsx
 * const schema = sanitySchemaToPortableTextSchema(sanitySchema)
 *
 * return (
 *   <EditorProvider
 *     initialConfig={{
 *       // ...
 *       schemaDefinition: schema,
 *     }}
 *   >
 *     // ...
 *   </EditorProvider>
 * ```
 */
declare function sanitySchemaToPortableTextSchema(sanitySchema: ArraySchemaType<unknown> | ArrayDefinition): Schema;
export { type PortableTextMemberSchemaTypes, createPortableTextMemberSchemaTypes, getSanitySubSchema, sanitySchemaToPortableTextSchema };
//# sourceMappingURL=index.d.ts.map