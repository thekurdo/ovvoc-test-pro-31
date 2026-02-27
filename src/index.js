const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('./strategies');
const { ensureAuth, ensureRole, tokenAuth } = require('./middleware');
const users = require('./users');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: 'multi-strategy-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(tokenAuth);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Login with username/password
app.post('/auth/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Logged in', user: { id: req.user.id, username: req.user.username, role: req.user.role } });
});

// Login with email/password
app.post('/auth/login/email', passport.authenticate('email'), (req, res) => {
  res.json({ message: 'Logged in', user: { id: req.user.id, username: req.user.username } });
});

// Get API token
app.post('/auth/token', ensureAuth, (req, res) => {
  const token = users.createToken(req.user.id);
  res.json({ token });
});

// Logout — req.logout(function(err) { if (err) { return next(err); } }); without callback (BREAKS in Passport 0.7)
app.post('/auth/logout', (req, res) => {
  req.logout(function(err) { if (err) { return next(err); } });
  res.json({ message: 'Logged out' });
});

// Current user
app.get('/auth/me', ensureAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role, email: req.user.email });
});

// Protected routes
app.get('/api/dashboard', ensureAuth, (req, res) => {
  res.json({ message: `Welcome ${req.user.username}`, role: req.user.role });
});

app.get('/api/admin/users', ensureRole('admin'), (req, res) => {
  res.json(users.users.map(u => ({ id: u.id, username: u.username, role: u.role })));
});

app.get('/api/editor/content', ensureRole('admin', 'editor'), (req, res) => {
  res.json({ message: 'Editor content', editor: req.user.username });
});

if (require.main === module) {
  app.listen(3000, () => console.log('Server on :3000'));
}

module.exports = app;
