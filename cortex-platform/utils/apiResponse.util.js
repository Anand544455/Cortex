/**
 * Keeps every API response in the same shape so the frontend
 * never has to guess the structure of a success or error payload.
 */
function success(res, statusCode, message, data = null, meta = null) {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
}

function failure(res, statusCode, message, errors = null) {
  const body = { success: false, message };
  if (errors !== null) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = { success, failure };
