const success = (res, { statusCode = 200, message, data } = {}) => {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  return res.status(statusCode).json(payload);
};

const fail = (res, { statusCode = 400, message, errors } = {}) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

module.exports = { success, fail };
