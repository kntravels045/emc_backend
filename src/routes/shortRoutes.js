const express = require('express');
const router = express.Router()
const shortRoutes = require('../controllers/shortControllers');

router.post("/add/short-category",shortRoutes.addShortCategory)
router.put("/short-category/:shortCategoryId",shortRoutes.updatedShortCategory)
router.delete("/short-category/:shortCategoryId",shortRoutes.deleteShortCategory)
router.post("/add/shorts-video", shortRoutes.addShorts)
router.put("/shorts/:shortId", shortRoutes.editShorts)
router.delete("/shorts/:shortId",shortRoutes.deleteShorts)
router.get("/shorts/all", shortRoutes.getAllShorts)  
router.get("/shorts", shortRoutes.getShortsByPagination )

module.exports = router