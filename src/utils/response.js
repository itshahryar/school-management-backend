const success = (res, { statusCode = 200, message, data } = {}) => {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  return res.status(statusCode).json(payload);
};

const fail = (res, { statusCode = 400, message, errors, code } = {}) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  if (code) payload.code = code;
  return res.status(statusCode).json(payload);
};

module.exports = { success, fail };
