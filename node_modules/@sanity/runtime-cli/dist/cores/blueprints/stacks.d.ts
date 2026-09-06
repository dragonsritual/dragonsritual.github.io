import type { ScopeType } from '../../utils/types.js';
import type { CoreConfig, CoreResult } from '../index.js';
export interface BlueprintStacksOptions extends CoreConfig {
    token: string;
    /** Scope to list Stacks for, resolved by the base command (flags > env > config). */
    scopeType: ScopeType;
    scopeId: string;
    /** Locally-configured Stack ID, used only to highlight the current Stack in listings. */
    localStackId?: string;
    flags: {
        'include-projects'?: boolean;
        verbose?: boolean;
    };
}
export declare function blueprintStacksCore(options: BlueprintStacksOptions): Promise<CoreResult>;
