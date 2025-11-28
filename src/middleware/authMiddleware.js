const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  
    if (!token) return res.status(401).json({ message: 'Access token missing' });
  
    jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid or expired access token' });
      req.user = user; // Attach user info to request
      next();
    });
  }

module.exports = authenticateToken