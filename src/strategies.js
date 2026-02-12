const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const users = require('./users');

// Local strategy (username/password)
passport.use('local', new LocalStrategy(
  function(username, password, done) {
    const user = users.findByUsername(username);
    if (!user) return done(null, false, { message: 'User not found' });
    if (!users.validate(user, password)) return done(null, false, { message: 'Invalid password' });
    return done(null, user);
  }
));

// Email strategy (email/password via custom fields)
passport.use('email', new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  function(email, password, done) {
    const user = users.findByEmail(email);
    if (!user) return done(null, false, { message: 'Email not found' });
    if (!users.validate(user, password)) return done(null, false, { message: 'Invalid password' });
    return done(null, user);
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  const user = users.findById(id);
  done(null, user || false);
});
