export const handleResponse = (res, status, message, project = null) => {
  res.status(status).json({ status, message, project });
};
