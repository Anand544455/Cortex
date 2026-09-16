const { validationResult } = require('express-validator');
const { failure } = require('../utils/apiResponse.util');

/**
 * Runs after express-validator's body()/param() checks in a route.
 * If any validation rule failed, respond immediately with a clean
 * list of messages instead of letting the controller run.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return failure(res, 400, 'Validation failed.', messages);
  }
  next();
}

module.exports = validate;
