/**
 * Middleware Privacy by Design: validateStrictInput(allowedKeys)
 * Rechaza cualquier campo no declarado en la lista de campos permitidos.
 * Usado en endpoints sensibles (M4 y otros con datos personales).
 *
 * @param {string[]} allowedKeys - Lista blanca de campos permitidos en req.body
 */
function validateStrictInput(allowedKeys) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return next();
    }
    const extraKeys = Object.keys(req.body).filter((k) => !allowedKeys.includes(k));
    if (extraKeys.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Campos no permitidos en la solicitud',
        data: null,
      });
    }
    next();
  };
}

module.exports = { validateStrictInput };
