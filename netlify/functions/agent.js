// Retired: the live agent endpoint is the Vercel function api/agent.js, which is
// origin-checked, rate-limited and grounded. This stub keeps any legacy call
// from reaching an unprotected model endpoint.
exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ response: 'This endpoint has been retired.' }),
});
