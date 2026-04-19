const { validationResult } = require('express-validator');
const {
  getLatestByType,
  getByTypeAndVersion,
} = require('../models/legalDocumentModel');
const { recordAgreement } = require('../models/userAgreementModel');

// GET /api/legal/terms — public (users must read terms before login/signup).
const getLatestTerms = async (req, res, next) => {
  try {
    const doc = await getLatestByType('terms');
    if (!doc) {
      return res.status(404).json({ message: 'No terms published yet' });
    }
    return res.json({ terms: doc });
  } catch (err) {
    next(err);
  }
};

// POST /api/user-agreements — authenticated. The userId is taken from the
// JWT, never from the body, to prevent a user from recording acceptance
// on behalf of someone else.
const acceptAgreement = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { type, version, agreed } = req.body;

    if (agreed !== true) {
      return res
        .status(400)
        .json({ message: 'agreed must be true to record acceptance' });
    }

    const doc = await getByTypeAndVersion(type, version);
    if (!doc) {
      return res
        .status(404)
        .json({ message: `No ${type} document found for version ${version}` });
    }

    const agreement = await recordAgreement({ userId, type, version });
    return res.status(201).json({ agreement });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLatestTerms,
  acceptAgreement,
};
