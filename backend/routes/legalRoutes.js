const express = require('express');
const { getLatestTerms } = require('../controllers/legalController');

const router = express.Router();

// Public: client needs terms before login/signup.
router.get('/terms', getLatestTerms);

module.exports = router;
