const express = require("express")
const router = express.Router()
const upload = require('../../multer')
const guestControllers = require("../controllers/guestControllers")


router.post("/add-guest",upload.single("guestImage"),guestControllers.addGuest)
router.get("/manage-guest", guestControllers.manageGuest)
router.get("/manage-guest/:guestId", guestControllers.manageGuestById)
router.put("/manage-guest/:guestId",upload.single("guestImage"), guestControllers.updateManageGuest)
router.delete("/manage-guest/:guestId", guestControllers.deleteManageGuest)


module.exports = router