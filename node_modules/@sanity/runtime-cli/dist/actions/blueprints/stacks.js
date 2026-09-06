import { blueprintsUrl } from '../../config.js';
import getHeaders from '../../utils/get-headers.js';
import { createTracedFetch } from '../../utils/traced-fetch.js';
export const stacksUrl = blueprintsUrl('stacks');
export async function listStacks(auth, logger) {
    const fetchFn = createTracedFetch(logger);
    try {
        const response = await fetchFn(stacksUrl, {
            method: 'GET',
            headers: getHeaders(auth),
        });
        const data = await response.json();
        return {
            ok: response.ok,
            error: response.ok ? null : data.message,
            stacks: data,
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
export async function getStack({ stackId, auth, logger, }) {
    const fetchFn = createTracedFetch(logger);
    try {
        const response = await fetchFn(`${stacksUrl}/${stackId}`, {
            method: 'GET',
            headers: getHeaders(auth),
        });
        const data = await response.json();
        return {
            ok: response.ok,
            error: response.ok ? null : data.message,
            stack: data,
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
export async function createStack({ stackMutation, auth, logger, }) {
    try {
        const fetchFn = createTracedFetch(logger);
        const response = await fetchFn(stacksUrl, {
            method: 'POST',
            headers: getHeaders(auth),
            body: JSON.stringify({ ...stackMutation, useProjectBasedId: false }), // API defaults to true as of 2025-11-26
        });
        const data = await response.json();
        return {
            ok: response.ok,
            error: response.ok ? null : data.message,
            stack: data,
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
export async function createEmptyStack({ token, scopeType, scopeId, name, logger, }) {
    if (!scopeId) {
        const scopeLabel = scopeType === 'organization' ? 'organization' : 'project';
        throw new Error(`Cannot create Stack: no ${scopeLabel} ID provided. ` +
            'Provide --project-id or --organization-id, or select a scope.');
    }
    const stackMutation = {
        name,
        scopeType,
        scopeId,
        document: { resources: [] },
    };
    const response = await createStack({
        stackMutation,
        auth: { token, scopeType, scopeId },
        logger,
    });
    if (!response.ok) {
        const scopeLabel = scopeType === 'organization' ? 'organization' : 'project';
        throw new Error(response.error || `Failed to create Stack "${name}" for ${scopeLabel} "${scopeId}".`);
    }
    return response.stack;
}
export async function updateStack({ stackId, stackMutation, auth, logger, }) {
    const fetchFn = createTracedFetch(logger);
    try {
        const response = await fetchFn(`${stacksUrl}/${stackId}`, {
            method: 'PUT',
            headers: getHeaders(auth),
            body: JSON.stringify(stackMutation),
        });
        const data = await response.json();
        return {
            ok: response.ok,
            error: response.ok ? null : data.message,
            stack: data,
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
export async function planStack({ stackId, document, auth, logger, }) {
    const fetchFn = createTracedFetch(logger);
    try {
        const response = await fetchFn(`${stacksUrl}/${stackId}/plan`, {
            method: 'POST',
            headers: getHeaders(auth),
            body: JSON.stringify({ document }),
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                ok: false,
                error: data.message || 'Failed to retrieve deployment plan',
                problems: response.status === 400 && Array.isArray(data.problems) ? data.problems : null,
                deploymentPlan: null,
            };
        }
        return { ok: true, error: null, problems: null, deploymentPlan: data };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            problems: null,
            deploymentPlan: null,
        };
    }
}
export async function resolveStackIdByNameOrId(value, auth, logger) {
    //     ID prefixed w 'ST-'         standard IDs: 13    old project IDs: 11
    if (value.startsWith('ST-') && (value.length === 13 || value.length === 11))
        return value;
    const result = await listStacks(auth, logger);
    if (!result.ok)
        throw new Error(result.error || 'Failed to list stacks');
    const match = result.stacks.find((s) => s.name === value);
    if (!match)
        throw new Error(`No stack found with name "${value}"`);
    return match.id;
}
export async function promoteStack({ stackId, auth, logger, name, }) {
    const fetchFn = createTracedFetch(logger);
    const hasName = typeof name === 'string' && name.length > 0;
    try {
        const response = await fetchFn(`${stacksUrl}/${stackId}/promote`, {
            method: 'POST',
            headers: getHeaders(auth),
            body: hasName ? JSON.stringify({ name }) : undefined,
        });
        const data = await response.json();
        return {
            ok: response.ok,
            error: response.ok ? null : data.message,
            stack: data,
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
export async function destroyStack({ stackId, auth, logger, }) {
    const fetchFn = createTracedFetch(logger);
    try {
        const response = await fetchFn(`${stacksUrl}/${stackId}`, {
            method: 'DELETE',
            headers: getHeaders(auth),
        });
        const data = await response.json();
        return {
            ok: response.ok,
            error: response.ok ? null : data.message,
            stack: data,
        };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
