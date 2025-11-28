const express = require("express")
const router = express.Router()
const blogsControllers = require("../controllers/blogsControllers")



router.post("/api/add-blogs",upload.fields([
      { name: "thumbnail", maxCount: 1 },
      { name: "images", maxCount: 50 },]),blogsControllers.addBlogs) 
router.get("/api/blogs", blogsControllers.getBlogsByPagination)
router.post("/api/blogs",blogsControllers.postAndGetBlogsByPagination)
router.get("/api/blogs/:blogId",blogsControllers.getBlogsById)   
router.get("/api/blogs/:blogId/similar",blogsControllers.getBlogsByIdWithSimilar )
router.delete("/api/blogs/:blogId",blogsControllers.deleteBlogsById)


module.exports = router