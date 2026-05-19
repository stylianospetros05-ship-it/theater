export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid request body',
        issues: result.error.flatten()
      });
    }

    req.body = result.data;
    next();
  };
}
