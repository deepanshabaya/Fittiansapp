const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { createUser, findUserByEmail } = require('../models/userModel');
const { createTrainer, getTrainerByUserId } = require('../models/trainerModel');
const { createCustomer, getCustomerByUserId } = require('../models/customerModel');

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ────────────────────────────────────────────────────────────
// POST /api/auth/login
//
// The client sends { email, password }.
// Role is auto-detected from the users table — no role selection needed.
// Admin-created users (no password set) can login by just providing email.
// ────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    console.log('[LOGIN] validating credentials', { email });
    const user = await findUserByEmail(email);
    console.log('[LOGIN] user lookup done', {
      found: Boolean(user),
      userRole: user?.role,
      userId: user?.id,
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials — user not found' });
    }

    // If user has a password set, verify it. If no password (admin-created), skip check.
    if (user.password) {
      const isMatch = user.password === password;
      console.log('[LOGIN] password compare done', { isMatch });
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials — wrong password' });
      }
    } else {
      // Admin-created user with no password — first login.
      // Optionally, the frontend could prompt them to set a password later.
      console.log('[LOGIN] no password set (admin-created user) — granting access');
    }

    const role = user.role;

    // Role-specific profile lookups
    let profile = null;
    let requiresApproval = false;
    let trainerId = null;
    let customerId = null;

    if (role === 'trainer') {
      console.log('[LOGIN] fetching trainer profile');
      profile = await getTrainerByUserId(user.id);
      console.log('[LOGIN] trainer lookup done', {
        profileFound: Boolean(profile),
      });
      if (profile) {
        trainerId = profile.id;
      }
      requiresApproval = false;
    } else if (role === 'customer') {
      console.log('[LOGIN] fetching customer profile');
      profile = await getCustomerByUserId(user.id);
      if (!profile) {
        // Backfill missing customer profile for legacy users.
        profile = await createCustomer({
          userId: user.id,
          startDate: null,
        });
      }
      console.log('[LOGIN] customer lookup done', {
        profileFound: Boolean(profile),
        customerId: profile?.id,
      });
      if (profile) {
        customerId = profile.id;
      }
    }
    // role === 'admin' → no extra profile needed

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role,
      trainerId,
      customerId,
    };

    const token = generateToken(tokenPayload);

    return res.json({
      token,
      user: tokenPayload,
      profile,
      requiresApproval,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/check-user
const checkUserExistsController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    if (email) {
      const user = await findUserByEmail(email);
      if (user) {
        // Return existence + role so frontend can route correctly
        return res.json({ exists: true, role: user.role });
      }
      return res.json({ exists: false });
    }

    return res.json({ exists: false });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      role,
      name,
      profilePhotoUrl,
      experienceYears,
      specialization,
      certifications,
      certificationAcademy,
      introductionVideoUrl,
    } = req.body;

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Temporary plain-text auth mode (not secure, for local debugging only).
    const user = await createUser({ email, password, role });

    let profile = null;
    let trainerId = null;
    let customerId = null;

    if (role === 'trainer') {
      profile = await createTrainer({
        userId: user.id,
        experienceYears: experienceYears || 0,
        specialization: specialization || null,
        bio: null,
        certifications: JSON.stringify(certifications || []),
        certificationAcademy: certificationAcademy || null,
        introductionVideoUrl: introductionVideoUrl || null,
      });
      trainerId = profile.id;
    } else if (role === 'customer') {
      profile = await createCustomer({
        userId: user.id,
        startDate: null,
      });
      customerId = profile.id;
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      trainerId,
      customerId,
    };

    const token = generateToken(tokenPayload);

    return res.status(201).json({
      token,
      user: tokenPayload,
      profile,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  register,
  checkUserExistsController,
};
