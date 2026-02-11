const express = require('express');
const router = express.Router()
const shortRoutes = require('../controllers/shortControllers');
const authenticateToken = require('../middleware/authMiddleware');


router.post("/add/short-category",authenticateToken, shortRoutes.addShortCategory)
router.put("/short-category/:shortCategoryId",authenticateToken,shortRoutes.updatedShortCategory)
router.delete("/short-category/:shortCategoryId",authenticateToken,shortRoutes.deleteShortCategory)
router.post("/add/shorts-video",authenticateToken, shortRoutes.addShorts)
router.put("/shorts/:shortId",authenticateToken, shortRoutes.editShorts)
router.delete("/shorts/:shortId",authenticateToken,shortRoutes.deleteShorts)
router.get("/shorts/all", shortRoutes.getAllShorts)  
router.get("/shorts",shortRoutes.getShortsByPagination )

module.exports = router