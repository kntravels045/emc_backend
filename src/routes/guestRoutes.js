const express = require("express")
const router = express.Router()
const upload = require('../../multer')
const guestControllers = require("../controllers/guestControllers")
const authenticateToken = require("../middleware/authMiddleware")


router.post("/add-guest",authenticateToken,upload.single("guestImage"),guestControllers.addGuest)
router.get("/manage-guest", guestControllers.manageGuest)
router.get("/manage-guest/:guestId", guestControllers.manageGuestById)
router.put("/manage-guest/:guestId",authenticateToken,upload.single("guestImage"), guestControllers.updateManageGuest)
router.delete("/manage-guest/:guestId",authenticateToken, guestControllers.deleteManageGuest)


module.exports = router