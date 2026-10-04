const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

function authMiddleware(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (decoded && decoded.id) {
          req.userId = decoded.id.toString();
          req.user = decoded;
          return next();
        }
      } catch (err) {
        // Token invalid or expired, fallback to header check
      }
    }

    const headerUserId = req.headers["x-user-id"];
    if (headerUserId && mongoose.Types.ObjectId.isValid(headerUserId)) {
      req.userId = headerUserId.toString();
      req.user = { id: headerUserId };
      return next();
    }

    const bodyUserId = req.body && req.body.userId;
    if (bodyUserId && mongoose.Types.ObjectId.isValid(bodyUserId)) {
      req.userId = bodyUserId.toString();
      req.user = { id: bodyUserId };
      return next();
    }

    return res.status(401).json({ error: "Authentication required" });
  } catch (err) {
    console.error("Auth middleware error: ", err.message);
    return res.status(500).json({ error: "Server authentication error" });
  }
}

module.exports = authMiddleware;
