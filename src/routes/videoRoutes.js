const express = require('express');
const videoControllers = require('../controllers/videoControllers');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router()


router.post("/add/video-category",authenticateToken, videoControllers.addCategory)
router.put("/video-category/:videoCategoryId",authenticateToken,videoControllers.updateVideoCategory)
router.delete("/video-category/:videoCategoryId",authenticateToken,videoControllers.deleteVideoCategory)
router.post("/add/episode-video",authenticateToken, videoControllers.addVideo)
router.get("/episode/all",videoControllers.getAllVideo)  
router.get("/episode", videoControllers.getVideoByPagination)
router.put("/video/:videoId",authenticateToken, videoControllers.editVideo)
router.delete("/video/:videoId",authenticateToken, videoControllers.deleteVideo)

module.exports = router