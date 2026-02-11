const prisma = require("../utils/prisma")
const config = require('../../config');
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require('../../s3Client')
const s3Client = new S3Client({
    region: config.AWS_REGION,
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    }
  })

const addBlogs =async (req, res) => {
    console.log(req.body)
    try {
      const { title, author, userId, content } = req.body;
      const parsedContent = JSON.parse(content);

      console.log("Parsed:", parsedContent);

      console.log(req.files)
      

      // ----- Thumbnail -----
      let thumbnail = null;
      if (req.files["thumbnail"]) {
        thumbnail = `${req.files["thumbnail"][0].location}`;
      }

      // ----- Image Blocks -----
      if (req.files["images"]) {
        req.files["images"].forEach((img, index) => {
          const block = parsedContent.find(
            (b) => b.type === "image" && b.value == index
          );
          if (block) block.value = `${img.location}`;
        });
      }

      const blog = await prisma.blog.create({
        data: {
          title,
          author,
          userId,
          thumbnail,
          content: parsedContent,
        },
      });

      res.json(blog);
    } catch (err) {
      console.log("POST ERROR", err);
      res.status(500).json({ error: "Failed to create blog" });
    }
}

const getBlogsByPagination = async (req, res) => {
    try {
      // Get from query → /api/blogs?page=1&limit=10
      let { page, limit } = req.query;
  
      page = parseInt(page) 
      limit = parseInt(limit)
  
      const skip = (page - 1) * limit;
  
      const blogs = await prisma.blog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      });
  
      const totalBlogs = await prisma.blog.count();
  
      res.json({
        totalBlogs,
        currentPage: page,
        totalPages: Math.ceil(totalBlogs / limit),
        blogs,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch blogs" });
    }
}

const postAndGetBlogsByPagination = async (req, res) => {
    try {
      const { page, limit } = req.body;
      const skip = (page - 1) * limit;
  // const
      const blogs = await prisma.blog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          blogId: true,
          title: true,
          thumbnail: true,
          author: true,
          createdAt: true,
        },
      });
  
      const totalBlogs = await prisma.blog.count();
  
      res.json({
        totalBlogs,
        currentPage: page,
        totalPages: Math.ceil(totalBlogs / limit),
        blogs,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch blogs" });
    }
}

const getBlogsById = async (req, res) => {
    const { blogId } = req.params;
  
    try {
      const blog = await prisma.blog.findUnique({
        where: { blogId },
      });
  
      if (!blog) {
        return res.status(404).json({ error: "Blog not found" });
      }
  
      res.json(blog);
    } catch (err) {
      res.status(500).json({ error: "Error fetching the blog" });
    }
}

const getBlogsByIdWithSimilar = async (req, res) => {
    const { blogId } = req.params;
  
    try {
      console.log("🔍 Fetching blog with ID:", blogId);
  
      // Fetch blog without blocks, content is JSON field
      const blog = await prisma.blog.findUnique({
        where: { blogId },
      });
  
      if (!blog) {
        console.log("❌ Blog not found");
        return res.status(404).json({ error: "Blog not found" });
      }
  
      console.log("✅ Blog found:", blog.title);
  
      // Fetch all blogs excluding current one
      let allBlogs = await prisma.blog.findMany({
        where: {
          NOT: { blogId: blog.blogId }
        },
        select: {
          blogId: true,
          title: true,
          thumbnail: true,
          updatedAt:true,
          createdAt:true
        }
      });
  
      // Shuffle and select 4 random blogs
      allBlogs = allBlogs.sort(() => Math.random() - 0.5);
      const randomBlogs = allBlogs.slice(0, 4);
  
      console.log("📌 Random blogs count:", randomBlogs.length);
  
      res.json({
        blog,
        relatedBlogs: randomBlogs
      });
  
    } catch (err) {
      console.error("GET Blog Error:", err);
      res.status(500).json({ error: "Failed to fetch blog" });
    }
}

const deleteBlogsById = async (req, res) => {
    console.log("🟡 DELETE /api/blogs/:blogId API Called");
  
    try {
      console.log("📥 Extracting blogId from params...");
      const { blogId } = req.params;
      console.log("👉 blogId:", blogId);
  
      console.log("🔍 Fetching blog from database...");
      const blog = await prisma.blog.findUnique({
        where: { blogId },
      });
  
      console.log("📄 Blog fetched:", blog);
  
      if (!blog) {
        console.log("❌ Blog NOT found!");
        return res.status(404).json({ error: "Blog not found" });
      }
  
      console.log("🧾 Initializing filesToDelete array...");
      let filesToDelete = [];
  
      // ------------------------------------
      // THUMBNAIL
      // ------------------------------------
      console.log("🖼 Checking thumbnail...");
      if (blog.thumbnail) {
        console.log("📸 Thumbnail found:", blog.thumbnail);
        filesToDelete.push(blog.thumbnail);
      } else {
        console.log("⚠️ Thumbnail NOT found");
      }
  
      // ------------------------------------
      // RECURSIVELY SCAN CONTENT JSON FOR IMAGES
      // ------------------------------------
      console.log("🔎 Starting recursive scan of content JSON...");
  
      const extractImageUrls = (obj) => {
        console.log("🔍 Scanning object:", obj);
  
        if (!obj) {
          console.log("⚠️ Null object encountered, skipping...");
          return;
        }
  
        if (typeof obj === "string") {
          console.log("📌 Found string:", obj);
          if (obj.includes("s3") || obj.includes("amazonaws.com")) {
            console.log("🖼 IMAGE URL FOUND:", obj);
            filesToDelete.push(obj);
          }
        }
  
        if (Array.isArray(obj)) {
          console.log("📚 It's an array, looping through items...");
          obj.forEach((item) => extractImageUrls(item));
        }
  
        if (typeof obj === "object") {
          console.log("🧩 It's an object, scanning values...");
          Object.values(obj).forEach((value) => extractImageUrls(value));
        }
      };
  
      console.log("🚀 Begin JSON scan...");
      extractImageUrls(blog.content);
      console.log("🎉 Finished scanning JSON!");
  
      console.log("📝 All identified URLs:", filesToDelete);
  
      // ------------------------------------
      // DELETE FILES FROM AWS S3
      // ------------------------------------
      console.log("🗑 Preparing to delete files from S3...");
  
      for (const photoUrl of filesToDelete) {
        console.log("🖼 Processing photoUrl:", photoUrl);
  
        try {
          console.log("🔠 Extracting S3 key from URL...");
          const decodedKey = decodeURIComponent(photoUrl.split("/").pop());
  
          console.log("👉 Extracted filename:", decodedKey);
  
          const fileKey = decodedKey.startsWith("Dashboard/")
            ? decodedKey
            : `Dashboard/${decodedKey}`;
  
          console.log("📌 Final S3 delete key:", fileKey);
  
          const deleteParams = {
            Bucket:config.env.S3_BUCKET_NAME,
            Key: fileKey,
          };
  
          console.log("📦 Delete Params:", deleteParams);
  
          const deleteCommand = new DeleteObjectCommand(deleteParams);
  
          console.log("🛰 Sending delete request to S3...");
          await s3.send(deleteCommand);
  
          console.log("✅ Successfully deleted from S3:", fileKey);
        } catch (err) {
          console.log("❌ Error deleting this file:", photoUrl, err);
        }
      }
  
      // ------------------------------------
      // DELETE BLOG FROM DATABASE
      // ------------------------------------
      console.log("🗑 Deleting blog from database...");
      await prisma.blog.delete({
        where: { blogId },
      });
  
      console.log("✅ Blog deleted from DB");
  
      res.json({ message: "Blog and all images deleted successfully" });
    } catch (err) {
      console.log("❌ SERVER ERROR:", err);
      res.status(500).json({ error: "Failed to delete blog" });
    }
  }

  const updateBlogs =  async (req, res) => {
      try {
        const { blogId } = req.params;
        const { title, author, content } = req.body;
        const parsedContent = JSON.parse(content);
  
        // 1️⃣ Fetch existing blog
        const oldBlog = await prisma.blog.findUnique({
          where: { blogId },
        });
        if (!oldBlog) {
          return res.status(404).json({ message: "Blog not found" });
        }
  
        let newThumbnail;
  
        // 2️⃣ Handle thumbnail replacement
        if (req.files?.thumbnail) {
          if (oldBlog.thumbnail) {
            const oldKey = decodeURIComponent(
              oldBlog.thumbnail.split("/").pop()
            );
            await s3.send(
              new DeleteObjectCommand({
                Bucket: config.S3_BUCKET_NAME,
                Key: `Dashboard/${oldKey}`,
              })
            );
          }
          newThumbnail = req.files.thumbnail[0].location;
        }
  
        // 3️⃣ Handle content images replacement
        if (req.files?.images) {
          req.files.images.forEach((img, uploadIndex) => {
            // Find the block with matching upload index placeholder
            const blockIndex = parsedContent.findIndex(
              b => b.type === "image" && b.value === uploadIndex
            );
            
            if (blockIndex === -1) return;
  
            const block = parsedContent[blockIndex];
            
            // Delete old image from S3 if it exists
            const oldBlock = oldBlog.content?.[blockIndex];
            if (oldBlock?.value && typeof oldBlock.value === 'string' && oldBlock.value.includes('amazonaws')) {
              const oldImgKey = decodeURIComponent(
                oldBlock.value.split("/").pop()
              );
              s3.send(
                new DeleteObjectCommand({
                  Bucket: config.S3_BUCKET_NAME,
                  Key: `Dashboard/${oldImgKey}`,
                })
              ).catch(err => console.error('Error deleting old image:', err));
            }
  
            // Replace with new image URL
            block.value = img.location;
          });
        }
  
        // 4️⃣ Update blog
        const updatedBlog = await prisma.blog.update({
          where: { blogId },
          data: {
            title,
            author,
            ...(newThumbnail && { thumbnail: newThumbnail }),
            content: parsedContent,
          },
        });
  
        res.json(updatedBlog);
      } catch (error) {
        console.error("PUT BLOG ERROR:", error);
        res.status(500).json({ message: "Failed to update blog", error: error.message });
      }
    }
  
module.exports = {
    addBlogs,
    getBlogsByPagination,
    postAndGetBlogsByPagination,
    getBlogsById,
    getBlogsByIdWithSimilar,
    deleteBlogsById,
    updateBlogs
}