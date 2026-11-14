const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  if (status >= 500) console.error(err.stack);

  res.status(status).json({
    success: false,
    error: err.message || 'Server Internal Error',
    message: err.message || 'Server Internal Error',
    ...(err.code && typeof err.code === 'string' ? { code: err.code } : {}),
    ...(err.extra && typeof err.extra === 'object' ? err.extra : {}),
  });
};

module.exports = errorHandler;
