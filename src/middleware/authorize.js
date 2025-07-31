export const authorize = (policy, resource) => (req, res, next) => {
  const user = req.user;
  if (policy(user, resource)) {
    return next();
  } else {
    return res.status(403).json({
      message:
        "Access denied, you do not have permission to perform this action",
      status: 403,
    });
  }
};
