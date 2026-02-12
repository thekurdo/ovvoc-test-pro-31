const users = [
  { id: 1, username: 'alice', password: 'alice123', role: 'admin', email: 'alice@example.com' },
  { id: 2, username: 'bob', password: 'bob123', role: 'editor', email: 'bob@example.com' },
  { id: 3, username: 'charlie', password: 'charlie123', role: 'viewer', email: 'charlie@example.com' },
  { id: 4, username: 'diana', password: 'diana123', role: 'admin', email: 'diana@example.com' },
];
const tokens = new Map();

function findByUsername(username) { return users.find(u => u.username === username); }
function findById(id) { return users.find(u => u.id === id); }
function findByEmail(email) { return users.find(u => u.email === email); }
function validate(user, password) { return user && user.password === password; }
function createToken(userId) {
  const token = 'tok_' + Math.random().toString(36).substring(2);
  tokens.set(token, userId);
  return token;
}
function findByToken(token) {
  const userId = tokens.get(token);
  return userId ? findById(userId) : null;
}

module.exports = { findByUsername, findById, findByEmail, validate, createToken, findByToken, users };
