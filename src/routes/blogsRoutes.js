const express = require("express")
const router = express.Router()
const blogsControllers = require("../controllers/blogsControllers")
const upload = require("../../multer")
const authenticateToken = require("../middleware/authMiddleware")


router.post("/add-blogs",upload.fields([
      { name: "thumbnail", maxCount: 1 },
      { name: "images", maxCount: 50 },]),blogsControllers.addBlogs) 
router.get("/blogs", blogsControllers.getBlogsByPagination)
router.post("/blogs",blogsControllers.postAndGetBlogsByPagination)
router.get("/blogs/:blogId",blogsControllers.getBlogsById)   
router.get("/blogs/:blogId/similar",blogsControllers.getBlogsByIdWithSimilar )
router.delete("/blogs/:blogId",blogsControllers.deleteBlogsById)


router.put(
      "/blogs/:blogId",
      authenticateToken,
      upload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "images", maxCount: 50 },
      ]),blogsControllers.updateBlogs)

module.exports = router