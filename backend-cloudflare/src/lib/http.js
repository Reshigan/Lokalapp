// HTTP / JSON helpers shared by all handlers.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

export function noContent() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function error(detail, status = 400) {
  return json({ detail }, status);
}

export function corsPreflight() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
