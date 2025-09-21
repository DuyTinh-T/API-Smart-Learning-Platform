// Rate limiting middleware (basic implementation)
const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of requests.entries()) {
      if (now - data.windowStart > windowMs) {
        requests.delete(ip);
      }
    }
    
    // Check current client
    const clientData = requests.get(clientIP);
    
    if (!clientData) {
      requests.set(clientIP, {
        count: 1,
        windowStart: now
      });
      return next();
    }
    
    if (now - clientData.windowStart > windowMs) {
      // Reset window
      requests.set(clientIP, {
        count: 1,
        windowStart: now
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((windowMs - (now - clientData.windowStart)) / 1000)} seconds`
      });
    }
    
    clientData.count++;
    next();
  };
};

module.exports = rateLimiter;
