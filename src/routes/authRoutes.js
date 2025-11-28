const express = require('express');
const router = express.Router()
const authControllers = require('../controllers/authControllers');
const authenticateToken = require('../middleware/authMiddleware');

router.post("/register",authenticateToken,authControllers.register)
router.post("/login",authControllers.login)
router.post("/refresh",authControllers.refresh)
router.post('/logout',authControllers.logout)
  
  
module.exports = router;