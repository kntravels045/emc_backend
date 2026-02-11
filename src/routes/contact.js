const express = require("express")
const router = express.Router()
const {contactForm, getContactDetails} = require("../controllers/contact")

router.post('/podcast-form', contactForm)
router.get("/podcast-form" , getContactDetails)


module.exports = router