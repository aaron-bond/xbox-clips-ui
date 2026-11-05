import { GUARD_HEADER, refusalReason } from '../_lib/guard';

/**
 * Serves the API from the site's own origin by forwarding `/api/*` to the API
 * Worker over the service binding (the API's PLAN-v1.md §6). The whole request is
 * forwarded, so the API still sees the visitor's IP as `CF-Connecting-IP`.
 *
 * `API_GUARD` is `enforce` to refuse cross-site requests with 403, or `report` to
 * forward them marked with `X-Site-Guard`, which the API logs.
 */
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const reason = refusalReason(request);
  if (reason !== null && env.API_GUARD === 'enforce') {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'This API serves xboxclips.io only.', status: 403 } },
      { status: 403 },
    );
  }

  const forwarded = new Request(request);
  // Only this function sets the marker; a visitor's own copy is dropped.
  forwarded.headers.delete(GUARD_HEADER);
  if (reason !== null) forwarded.headers.set(GUARD_HEADER, reason);
  return env.API.fetch(forwarded);
};
