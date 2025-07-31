const auditMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  console.log(`📝 [${new Date().toISOString()}] ${req.method} ${req.path}`, {
    userId: req.headers["user-id"] || "anonymous",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Log response time
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(`✅ Response: ${res.statusCode} - ${duration}ms`);
  });

  next();
};

export default auditMiddleware;
