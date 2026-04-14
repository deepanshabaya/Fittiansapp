const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { findUserByEmail, findUserByMobile } = require('../models/userModel');
const { query } = require('../config/db');
const { getTrainerByUserId } = require('../models/trainerModel');
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
// Mobile-based registration:
//   1. Find user by mobile in public.users
//   2. If found → UPDATE email, password, modifiedon, is_registered
//   3. If not found → reject (admin must create the user first)
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { mobile, email, password } = req.body;

    // Step 1: Lookup user by mobile
    const user = await findUserByMobile(mobile);
    if (!user) {
      return res.status(404).json({
        message: 'Mobile not registered. Please contact admin to create your account.',
      });
    }

    // Step 2: Block re-registration if already registered
    if (user.is_registered) {
      return res.status(409).json({
        message: 'Already registered. Please login.',
      });
    }

    // Step 3: Check if email is already taken by a *different* user
    if (email) {
      const emailOwner = await findUserByEmail(email);
      if (emailOwner && emailOwner.id !== user.id) {
        return res.status(409).json({ message: 'This email is already used by another account.' });
      }
    }

    // Step 3: Update email, password, modifiedon, is_registered
    const updated = await query(
      `UPDATE users
       SET email = $1, password = $2, modifiedon = NOW(), is_registered = true
       WHERE id = $3
       RETURNING id, name, email, role, mobile`,
      [email.trim(), password, user.id]
    );
    const updatedUser = updated.rows[0];

    // Step 4: Fetch role-specific profile
    let profile = null;
    let trainerId = null;
    let customerId = null;

    if (updatedUser.role === 'trainer') {
      profile = await getTrainerByUserId(updatedUser.id);
      trainerId = profile?.id || null;
    } else if (updatedUser.role === 'customer') {
      profile = await getCustomerByUserId(updatedUser.id);
      if (!profile) {
        profile = await createCustomer({ userId: updatedUser.id, startDate: null });
      }
      customerId = profile?.id || null;
    }

    const requiresApproval = updatedUser.role === 'trainer' && profile && !profile.is_approved;

    const tokenPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      trainerId,
      customerId,
    };

    const token = generateToken(tokenPayload);

    return res.status(200).json({
      message: 'Registration successful',
      token,
      user: tokenPayload,
      profile,
      requiresApproval,
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
