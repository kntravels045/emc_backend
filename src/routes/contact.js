const express = require("express")
const router = express.Router()
const {contactForm,deletePodcastSubmission, getContactDetails} = require("../controllers/contact")

router.post('/podcast-form', contactForm)
router.get("/podcast-form" , getContactDetails)
router.delete("/podcast-form/:submissionId", deletePodcastSubmission);


module.exports = router