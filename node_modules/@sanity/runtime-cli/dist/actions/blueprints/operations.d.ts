import type { Logger } from '../../utils/logger.js';
import type { ActionResponse, AuthParams, StackOperation } from '../../utils/types.js';
/** Delay before the first operation poll. Override with SANITY_OPERATION_POLL_INITIAL_DELAY_MS. */
export declare const OPERATION_POLL_INITIAL_DELAY_MS: number;
/** Interval between operation status polls. Override with SANITY_OPERATION_POLL_INTERVAL_MS. */
export declare const OPERATION_POLL_INTERVAL_MS: number;
/** Consecutive failed polls tolerated before giving up on confirming status. */
export declare const OPERATION_POLL_MAX_CONSECUTIVE_ERRORS = 5;
/**
 * Classify a single poll. Terminal status -> 'completed'/'failed'. 404 ->
 * 'pending' (read-replica lag). Other failed responses -> 'error'. The caller
 * decides whether an 'error' is retryable.
 */
export declare function classifyOperationPoll(options: {
    ok: boolean;
    httpStatus: number | undefined;
    operation: StackOperation | undefined;
}): 'pending' | 'completed' | 'failed' | 'error';
interface GetOperationResponse extends ActionResponse {
    operation?: StackOperation;
    response?: Response;
}
export declare function getOperation({ stackId, operationId, auth, logger, includeDestroyed, }: {
    stackId: string;
    operationId: string;
    auth: AuthParams;
    logger: Logger;
    includeDestroyed?: boolean;
}): Promise<GetOperationResponse>;
export {};
