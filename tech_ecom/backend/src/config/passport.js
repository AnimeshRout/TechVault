// PASSPORT.JS — Google OAuth2 Strategy
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

export default function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
        passReqToCallback: true, // Enables access to req (and req.query.state)
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }

          // Parse state to check if this is an admin login attempt
          let isAdminLogin = false;
          try {
            const state = JSON.parse(req.query.state || '{}');
            isAdminLogin = state.from === 'admin';
          } catch {
            // Invalid state, treat as user login
          }

          // Check if user already exists
          let user = await User.findOne({ email });

          if (user) {
            // Existing user — mark email as verified if not already
            if (!user.isEmailVerified) {
              user.isEmailVerified = true;
              await user.save({ validateBeforeSave: false });
            }
            return done(null, user);
          }

          // ── Admin path: do NOT auto-create ──────────────────────────────
          // If this is an admin login, the user MUST already exist with
          // role: 'admin'. Creating a stray role:'user' account for a random
          // Gmail hitting the admin login is DB clutter we don't want.
          if (isAdminLogin) {
            return done(null, false, { message: 'No admin account for this email' });
          }

          // ── User path: create new account ──────────────────────────────
          user = await User.create({
            name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
            email,
            password: `Google_${Date.now()}_${Math.random().toString(36).slice(2)}`, // Random password (user won't use it)
            avatar: profile.photos?.[0]?.value || '',
            isEmailVerified: true, // Google already verified the email
            role: 'user',
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  // Serialize/deserialize (not used since we use JWTs, but required by Passport)
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}
