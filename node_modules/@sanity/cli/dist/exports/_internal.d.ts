import { getStudioEnvironmentVariables } from "@sanity/cli-build/_internal/env";
import { Schema } from "@sanity/types";
import { StudioEnvVariablesOptions } from "@sanity/cli-build/_internal/env";

/**
 * Extracts all serializable properties from userland schema types,
 * so they best-effort can be used as definitions for Schema.compile.
 *
 * @internal
 */
export declare function extractManifestSchemaTypes(
  schema: Schema,
  workDir: string,
): Promise<ManifestSchemaType[]>;

export { getStudioEnvironmentVariables };

declare type ManifestArrayMember = Omit<ManifestSchemaType, "name"> & {
  name?: string;
};

declare type ManifestField = ManifestSchemaType & {
  fieldset?: string;
};

declare interface ManifestFieldset {
  [index: string]: ManifestSerializable | undefined;
  name: string;
  title?: string;
}

declare type ManifestReferenceMember = Omit<ManifestSchemaType, "name"> & {
  name?: string;
};

declare interface ManifestSchemaType {
  name: string;
  type: string;
  deprecated?: {
    reason: string;
  };
  fields?: ManifestField[];
  fieldsets?: ManifestFieldset[];
  hidden?: "conditional" | boolean;
  lists?: ManifestTitledValue[];
  marks?: {
    annotations?: ManifestArrayMember[];
    decorators?: ManifestTitledValue[];
  };
  of?: ManifestArrayMember[];
  options?: Record<string, ManifestSerializable>;
  preview?: {
    select: Record<string, string>;
  };
  readOnly?: "conditional" | boolean;
  styles?: ManifestTitledValue[];
  title?: string;
  to?: ManifestReferenceMember[];
  validation?: ManifestValidationGroup[];
}

declare type ManifestSerializable =
  | boolean
  | ManifestSerializable[]
  | number
  | string
  | {
      [k: string]: ManifestSerializable;
    };

declare interface ManifestTitledValue {
  value: string;
  title?: string;
}

declare interface ManifestValidationGroup {
  rules: ManifestValidationRule[];
  level?: "error" | "info" | "warning";
  message?: string;
}

declare type ManifestValidationRule = {
  [index: string]: ManifestSerializable | undefined;
  constraint?: ManifestSerializable;
  flag: string;
};

export { StudioEnvVariablesOptions };

export {};
