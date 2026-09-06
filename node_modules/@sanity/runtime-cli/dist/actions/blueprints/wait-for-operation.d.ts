import type { Logger } from '../../utils/logger.js';
import type { AuthParams } from '../../utils/types.js';
/** Result of waiting for a deploy/destroy operation to settle. */
export type OperationOutcome = {
    type: 'completed';
} | {
    type: 'failed';
    logHints: string[];
} | {
    type: 'unconfirmed';
    error?: string;
};
export interface WaitForOperationOptions {
    stackId: string;
    operationId: string;
    auth: AuthParams;
    log: Logger;
    bin: string;
    verbose?: boolean;
    /** Keep the operation queryable after the stack is gone (destroy). */
    includeDestroyed?: boolean;
    /** Noun for the idle message, e.g. "deployment" or "destruction". */
    progressNoun: string;
}
/**
 * Stream logs and poll an operation until it settles.
 * handles log-stream lifecycle, retry budget, and idle messaging;
 * the caller maps the returned outcome to its own result/messaging.
 */
export declare function waitForOperation(options: WaitForOperationOptions): Promise<OperationOutcome>;
