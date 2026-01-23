const express = require('express');
const router = express.Router()
const shortRoutes = require('../controllers/shortControllers');

router.post("/add/short-category",shortRoutes.addShortCategory)
router.put("/api/short-category/:shortCategoryId",shortRoutes.updatedShortCategory)
router.delete("/api/short-category/:shortCategoryId",shortRoutes.deleteShortCategory)
router.post("/add/shorts-video", shortRoutes.addShorts)
router.put("/shorts/:shortId", shortRoutes.editShorts)
router.delete("/api/shorts/:shortId",shortRoutes.deleteShorts)
router.get("/api/shorts/all", shortRoutes.getAllShorts)  
router.get("/api/shorts", shortRoutes.getShortsByPagination )

module.exports = router