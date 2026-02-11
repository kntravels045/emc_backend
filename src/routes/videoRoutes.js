const express = require('express');
const videoControllers = require('../controllers/videoControllers');
const router = express.Router()


router.post("/add/video-category", videoControllers.addCategory)
router.put("/video-category/:videoCategoryId",videoControllers.updateVideoCategory)
router.delete("/video-category/:videoCategoryId",videoControllers.deleteVideoCategory)
router.post("/add/episode-video", videoControllers.addVideo)
router.get("/episode/all",videoControllers.getAllVideo)  
router.get("/episode", videoControllers.getVideoByPagination)
router.put("/video/:videoId", videoControllers.editVideo)
router.delete("/video/:videoId", videoControllers.deleteVideo)

module.exports = router