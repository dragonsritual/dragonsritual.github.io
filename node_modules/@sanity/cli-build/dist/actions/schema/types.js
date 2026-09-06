import { z } from 'zod/mini';
export const extractSchemaWorkerData = z.object({
    configPath: z.string(),
    enforceRequiredFields: z.boolean(),
    workDir: z.string(),
    workspaceName: z.optional(z.string())
});

//# sourceMappingURL=types.js.map