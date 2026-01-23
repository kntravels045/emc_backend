const express = require('express');
const videoControllers = require('../controllers/videoControllers');
const router = express.Router()


router.post("/api/add/video-category", videoControllers.addCategory)
router.put("/api/video-category/:videoCategoryId",videoControllers.updateVideoCategory)
router.delete("/api/video-category/:videoCategoryId",videoControllers.deleteVideoCategory)
router.post("/add/episode-video", videoControllers.addVideo)
router.get("/episode/all",videoControllers.getAllVideo)  
router.get("/api/episode", videoControllers.getVideoByPagination)
router.put("/api/video/:videoId", videoControllers.editVideo)
router.delete("/api/video/:videoId", videoControllers.deleteVideo)

module.exports = router