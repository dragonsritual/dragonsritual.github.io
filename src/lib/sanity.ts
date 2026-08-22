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