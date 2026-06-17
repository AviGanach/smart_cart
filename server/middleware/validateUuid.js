/**
 * Validates that query params or route params are valid UUIDs.
 * Usage: router.get('/', validateUuid('family_id'), handler)
 */
function validateUuid(...paramNames) {
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return (req, res, next) => {
    for (const name of paramNames) {
      const value = req.query[name] || req.params[name];
      if (!value) {
        return res.status(400).json({
          success: false,
          data: null,
          error: `הפרמטר "${name}" נדרש.`,
        });
      }
      if (!UUID_REGEX.test(value)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: `הפרמטר "${name}" אינו UUID תקין. ודא שהגדרת REACT_APP_FAMILY_ID ב-.env.`,
        });
      }
    }
    next();
  };
}

module.exports = { validateUuid };
