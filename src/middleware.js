function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Authentication required' });
}

function ensureRole(...roles) {
  return function(req, res, next) {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function tokenAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.substring(7);
  const users = require('./users');
  const user = users.findByToken(token);
  if (user) req.user = user;
  next();
}

module.exports = { ensureAuth, ensureRole, tokenAuth };
