import getHeaders from '../../utils/get-headers.js';
import { createTracedFetch } from '../../utils/traced-fetch.js';
import { stacksUrl } from './stacks.js';
const envMs = (value, fallback) => {
    if (!value)
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};
/** Delay before the first operation poll. Override with SANITY_OPERATION_POLL_INITIAL_DELAY_MS. */
export const OPERATION_POLL_INITIAL_DELAY_MS = envMs(process.env.SANITY_OPERATION_POLL_INITIAL_DELAY_MS, 1000);
/** Interval between operation status polls. Override with SANITY_OPERATION_POLL_INTERVAL_MS. */
export const OPERATION_POLL_INTERVAL_MS = envMs(process.env.SANITY_OPERATION_POLL_INTERVAL_MS, 1500);
/** Consecutive failed polls tolerated before giving up on confirming status. */
export const OPERATION_POLL_MAX_CONSECUTIVE_ERRORS = 5;
/**
 * Classify a single poll. Terminal status -> 'completed'/'failed'. 404 ->
 * 'pending' (read-replica lag). Other failed responses -> 'error'. The caller
 * decides whether an 'error' is retryable.
 */
export function classifyOperationPoll(options) {
    const { ok, httpStatus, operation } = options;
    if (ok) {
        if (operation?.status === 'COMPLETED')
            return 'completed';
        if (operation?.status === 'FAILED')
            return 'failed';
        return 'pending';
    }
    if (httpStatus === 404)
        return 'pending';
    return 'error';
}
export async function getOperation({ stackId, operationId, auth, logger, includeDestroyed, }) {
    const fetchFn = createTracedFetch(logger);
    const url = new URL(`${stacksUrl}/${stackId}/operations/${operationId}`);
    if (includeDestroyed)
        url.searchParams.append('includeDestroyed', 'true');
    try {
        const response = await fetchFn(url.toString(), {
            method: 'GET',
            headers: getHeaders(auth),
        });
        const data = await response.json();
        return {
            ok: response.ok,
            error: response.ok ? null : data.message,
            operation: data,
            response,
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
