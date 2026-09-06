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