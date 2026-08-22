import { databaseSeedSchema } from "../src/domain/schemas.ts";
import { validateRelationships } from "../src/domain/validateRelationships.ts";
import { seedData } from "../src/data/seed.ts";

try {
  const parsed = databaseSeedSchema.parse(seedData);
  const relationshipErrors = validateRelationships(parsed);

  if (relationshipErrors.length > 0) {
    console.error("Relationship validation failed:");
    relationshipErrors.forEach((error) => console.error(` - ${error}`));
    process.exit(1);
  }

  console.log("DragonsRitual data validation passed.");
  console.log(`Platforms: ${parsed.platforms.length}`);
  console.log(`Games: ${parsed.games.length}`);
  console.log(`Sessions: ${parsed.sessions.length}`);
  console.log(`Streams: ${parsed.streams.length}`);
  console.log(`Articles: ${parsed.articles.length}`);
  console.log(`Media: ${parsed.media.length}`);
  console.log(`World locations: ${parsed.worldLocations.length}`);
} catch (error) {
  console.error("Schema validation failed.");
  console.error(error);
  process.exit(1);
}