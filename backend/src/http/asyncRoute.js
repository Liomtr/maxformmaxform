export function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (error) {
      if (error?.body) {
        return res.status(error.status || 500).json(error.body)
      }
      next(error)
    }
  }
}
