const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { PrismaClient } = require('@prisma/client')
const app = express()
const prisma = new PrismaClient()
const { PutObjectCommand,DeleteObjectCommand} = require("@aws-sdk/client-s3");
const s3 = require('./s3Client')

const upload = require("./multer.js");
dotenv.config();
app.use(cors({
    origin: "http://localhost:5173",   // your frontend URL
    credentials: true
  }));
app.use(express.json())
app.use(cookieParser())

//console.log(process.env.ACCESS_SECRET)

app.get('/test',(req,res)=>{
    console.log('Working Perfect')
    res.send('Working Perfect...')
})

// ==========================
// Middleware: Protect Routes
// ==========================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  
    if (!token) return res.status(401).json({ message: 'Access token missing' });
  
    jwt.verify(token, process.env.ACCESS_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid or expired access token' });
      req.user = user; // Attach user info to request
      next();
    });
  }
  

// ==========================
// 🧍‍♂️ Register Route
// ==========================
app.post("/register", async (req, res) => {
    const data = req.body;
    try {
      const existing = await prisma.user.findUnique({
         where: { 
            email:data.email
          } 
        });

      if (existing) {
        return res.status(400).json({ message: "Email already registered" })
       }
      
      const hashedPassword = await bcrypt.hash(data.password, 10);
  
      await prisma.user.create({
        data: { 
            name:data.name,
            email: data.email, 
            password: hashedPassword 
        },
      });
  
      res.status(201).json({ message: "User registered successfully"});
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server error" });
    }
  });
  
  // ==========================
  // 🔑 Login Route
  // ==========================
  app.post("/login", async (req, res) => {
    const data = req.body;
    try {
      const user = await prisma.user.findUnique({
         where: { 
            email:data.email
        } 
    });
      if (!user) return res.status(400).json({ message: "Invalid credentials" });
  
      const isMatch = await bcrypt.compare(data.password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
  
      const accessToken = jwt.sign({ userId:user.userId }, process.env.ACCESS_SECRET , { expiresIn: '30s' });
      const refreshToken = jwt.sign({ userId:user.userId }, process.env.ACCESS_SECRET , { expiresIn: '60s' });
  
       await prisma.user.update({
        where: { 
            userId: user.userId
        },
        data: { 
            refreshToken:refreshToken },
      });
  
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      

  
      res.json({ accessToken, userId:user.userId, message: "Login successful" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });
  
  // ==========================
  // 🔄 Refresh Token Route
  // ==========================

  app.post("/refresh", async (req, res) => {
    try {
      const { refreshToken} = req.cookies;
      if (!refreshToken) {
        return res.status(401).json({ message: "No token found" });
      }
  
      // ✅ Verify refresh token using correct secret
      const decoded = jwt.verify(refreshToken, process.env.ACCESS_SECRET);
      console.log("Decoded token:", decoded);
  
      // ✅ Find user using correct field (id)
      const user = await prisma.user.findUnique({
        where: { userId: decoded.userId },
      });
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      if (user.refreshToken !== refreshToken) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }
  
      // ✅ Create new access token
      const newAccessToken = jwt.sign(
        { id: user.id },
        process.env.ACCESS_SECRET,
        { expiresIn: "30s" }
      );
  
      res.json({ accessToken: newAccessToken });
    } catch (err) {
      console.error(err);
      res.status(403).json({ message: "Invalid or expired refresh token" });
    }
  });


  // ==========================
// Logout Route
// ==========================
app.post('/logout', async (req, res) => {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) return res.sendStatus(204);
  
      const decoded = jwt.verify(refreshToken, process.env.ACCESS_SECRET);
  
      // Clear refresh token in DB
      await prisma.user.update({
        where: { userId: decoded.userId },
        data: { refreshToken: null },
      });
  
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
  
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  // ==========================
  // Protected Route Example
  // ==========================
  app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'You accessed a protected route!', userId: req.user.id });
  });
  
  // ==========================
  // Additional Route Example
  // ==========================
  app.post('/profile', authenticateToken, async (req, res) => {
    const data = req.body
    try {
      const user = await prisma.user.findUnique({ where: { userId: data.userId } });
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      res.json({ id: user.id, name: user.name, email: user.email });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ✅ Create Video Category
  app.post("/api/add/video-category", async (req, res) => {
    try {
      const data = req.body;
  
      if (!data.name || !data.userId) {
        return res.status(400).json({ message: "Name and userId are required" });
      }
  
      const createVideoCategory = await prisma.videoCategory.create({
        data: {
          name: data.name,
          userId: data.userId,
        },
      });
  
      return res.status(201).json({
        data: createVideoCategory,
        message: "VideoCategory created successfully",
      });
    } catch (error) {
      console.error("Error creating video category:", error);
      return res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  });
  
// ✅ Create Short Category
  app.post("/api/add/short-category", async (req, res) => {
    try {
      const data = req.body;
  
      if (!data.name || !data.userId) {
        return res.status(400).json({ message: "Name and userId are required" });
      }
  
      const createShortCategory = await prisma.shortCategory.create({
        data: {
          name: data.name,
          userId: data.userId,
        },
      });
  
      return res.status(201).json({
        data: createShortCategory,
        message: "ShortCategory created successfully",
      });
    } catch (error) {
      console.error("Error creating short category:", error);
      return res
        .status(500)
        .json({ message: "Internal Server Error", error: error.message });
    }
  });

  app.post("/api/add/shorts-video", async (req, res) => {
    try {
      const data = req.body;
  
      const addShortsVideo = await prisma.short.create({
        data: {
          videoLink: data.videoLink,
          shortCategoryId: data.shortCategoryId, // keep naming consistent
        },
      });
  
      return res.status(201).json({
        message: "Shorts video added successfully",
      });
    } catch (error) {
      console.error("Error adding shorts video:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });

  app.post("/api/add/episode-video", async (req, res) => {
    try {
      const data = req.body;
      const addEpisode = await prisma.video.create({
        data: {
            title          :data.title,
            description    :data.description,
            hostName       :data.hostName,
            episodeNumber  :data.episodeNumber,
            hostVideoLink  :data.hostVideoLink,
            videoCategoryId:data.videoCategoryId
        },
      });
      return res.status(201).json({
        data: addEpisode,
        message: "Episode video added successfully",
      });
    } catch (error) {
      console.error("Error adding shorts video:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });

  app.get("/api/episode/all", async (req, res) => {
    try {
      const { page, limit } = req.query;
  
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;
  
      // Fetch only videos
      const videos = await prisma.video.findMany({
        skip,
        take: limitNumber,
        orderBy: { createdAt: "desc" },
        select: {
          videoId: true,
          title: true,
          description: true,
          hostName: true,
          episodeNumber: true,
          hostVideoLink: true,
          createdAt: true,
          videoCategory: {   
            select: {
              name: true,
            },
          },
        },
      });
  
      // Count total for pagination
      const totalVideos = await prisma.video.count();
  
      return res.status(200).json({
        videos,
        pagination: {
          totalVideos,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalVideos / limitNumber),
          limit: limitNumber,
        },
      });
    } catch (error) {
      console.error("Error fetching all videos:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });
  
  app.get("/api/episode", async (req, res) => {
    try {
      const { categoryId, page = 1, limit = 4 } = req.query;
  
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;
  
      if (!categoryId) {
        // If no categoryId passed, return list of categories only
        const categories = await prisma.videoCategory.findMany({
          select: {
            videoCategoryId: true,
            name: true,
          },
        });
  
        return res.status(200).json({
          categories,
        });
      }
  
      // Fetch one category by ID with paginated videos
      const category = await prisma.videoCategory.findUnique({
        where: { videoCategoryId: categoryId },
        include: {
          videos: {
            skip: skip,
            take: limitNumber,
            orderBy: { createdAt: "desc" },
          },
        },
      });
  
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
  
      // Count total videos for pagination info
      const totalVideos = await prisma.video.count({
        where: { videoCategoryId: categoryId },
      });
  
      return res.status(200).json({
        category: {
          id: category.videoCategoryId,
          name: category.name,
        },
        videos: category.videos,
        pagination: {
          totalVideos,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalVideos / limitNumber),
          limit: limitNumber,
        },
      });
    } catch (error) {
      console.error("Error fetching episodes:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });

  // ✅ Update Video
// app.put("/api/video/:videoId", async (req, res) => {
//     try {
//       const { videoId } = req.params;
//       const { title, description, embedUrl, categoryId } = req.body;
  
//       const updatedVideo = await prisma.video.update({
//         where: { videoId },
//         data: {
//           title,
//           description,
//           embedUrl,
//           videoCategoryId: categoryId,
//         },
//       });
  
//       return res.status(200).json({
//         message: "Video updated successfully",
//         video: updatedVideo,
//       });
//     } catch (error) {
//       console.error("Error updating video:", error);
//       return res.status(500).json({
//         message: "Internal Server Error",
//         error: error.message,
//       });
//     }
//   });

  app.put("/api/video/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      const { title, description, hostName, episodeNumber, hostVideoLink,videoCategoryId} = req.body;
  
      const updatedVideo = await prisma.video.update({
        where: { videoId },
        data: {
          title,
          description,
          hostName,
          episodeNumber,
          hostVideoLink,
          videoCategoryId,
        },
      });
  
      return res.status(200).json({
        message: "✅ Video updated successfully",
        video: updatedVideo,
      });
    } catch (error) {
      console.error("Error updating video:", error);
      return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  });

  app.delete("/api/video/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
  
      await prisma.video.delete({
        where: { videoId },
      });
  
      return res.status(200).json({ 
        message: "Video deleted successfully"
       });
    } catch (error) {
      console.error("Error deleting video:", error);
      return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  });

  app.put("/api/shorts/:shortId", async (req, res) => {
    try {

      const { shortId } = req.params;
      const { videoLink,shortCategoryId} = req.body;
  
      const updatedShort = await prisma.short.update({
        where: { shortId },
        data: {
            videoLink,
            shortCategoryId
        },
      });
  
      return res.status(200).json({
        message: "✅ Shorts updated successfully",
        short:updatedShort
      });
    } catch (error) {
      console.error("Error updating video:", error);
      return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  });

  app.delete("/api/shorts/:shortId", async (req, res) => {
    try {
      const { shortId } = req.params;
  
      await prisma.short.delete({
        where: { shortId },
      });
  
      return res.status(200).json({ message: "Shorts deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  });

  app.get("/api/shorts/all", async (req, res) => {
    try {
      const { page, limit } = req.query; // Default values
  
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;
  
      // ✅ Fetch paginated shorts
      const shorts = await prisma.short.findMany({
        skip,
        take: limitNumber,
        orderBy: { createdAt: "desc" },
        select: {
          shortId: true,
          videoLink: true,
          shortCategoryId: true,
          createdAt: true,
          shortCategory: {
            select: {
              name: true,
            },
          },
        },
      });
  
      // ✅ Count total shorts for pagination
      const totalShorts = await prisma.short.count();
  
      // ✅ Response
      return res.status(200).json({
        shorts,
        pagination: {
          totalShorts,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalShorts / limitNumber),
          limit: limitNumber,
        },
      });
    } catch (error) {
      console.error("Error fetching all shorts:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });
  
  
  app.get("/api/shorts", async (req, res) => {
    try {
      const { shortCategoryId, page, limit } = req.query;
  
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
      const skip = (pageNumber - 1) * limitNumber;
  
      // ✅ If no categoryId passed, return list of short categories only
      if (!shortCategoryId) {
        const shortCategory = await prisma.shortCategory.findMany({
          select: {
            shortCategoryId: true,
            name: true,
          },
        });
  
        return res.status(200).json({
            shortCategory,
        });
      }
  
      // ✅ Fetch one category by ID with paginated shorts
      const shortCategory = await prisma.shortCategory.findUnique({
        where: { shortCategoryId: shortCategoryId },
        include: {
          shorts: {
            skip: skip,
            take: limitNumber,
            orderBy: { createdAt: "desc" },
          },
        },
      });
  
      if (!shortCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
  
      // ✅ Count total shorts for pagination info
      const totalShorts = await prisma.short.count({
        where: { shortCategoryId: shortCategoryId },
      });
  
      return res.status(200).json({
        category: {
          id: shortCategory.shortCategoryId,
          name: shortCategory.name,
        },
        shorts: shortCategory.shorts,
        pagination: {
          totalShorts,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalShorts / limitNumber),
          limit: limitNumber,
        },
      });
    } catch (error) {
      console.error("Error fetching shorts:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });
  
//////////////////////////////////////////////////
// addingGuestRoute

app.post("/api/add-guest",upload.single("guestImage"),async (req, res) => {
    try {
      const {
        guestImage,
        guestName,
        guestRole,
        aboutGuest,
        instagram,
        twitter,
        threads,
        headingOne,
        descriptionOne,
        headingTwo,
        descriptionTwo,
        headingthree,
        descriptionThree,
        youtubeLink,
        userId,
      } = req.body;
  
      // ✅ Validation check
      if (
        !req.file ||
        !guestName ||
        !guestRole ||
        !aboutGuest ||
        !headingOne ||
        !descriptionOne ||
        !headingTwo ||
        !descriptionTwo ||
        !headingthree ||
        !descriptionThree ||
        !youtubeLink ||
        !userId
      ) {
        return res.status(400).json({ message: "All required fields must be filled." });
      }

      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "guests",
      });
  
      // ✅ Create new guest
      const newGuest = await prisma.guest.create({
        data: {
         guestImage: uploadResult.secure_url, // Cloudinary URL
          guestName,
          guestRole,
          aboutGuest,
          instagram,
          twitter,
          threads,
          headingOne,
          descriptionOne,
          headingTwo,
          descriptionTwo,
          headingthree,
          descriptionThree,
          youtubeLink,
          userId,
        },
      });
  
      return res.status(201).json({
        message: "Guest created successfully ✅",
        guest: newGuest,
      });
    } catch (error) {
      console.error("Error creating guest:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });

app.get("/api/manage/guest", async (req,res)=>{
    const manageGuest = await prisma.guest.findMany()
    res.json({
        data:manageGuest
    })
  })
  
app.get("/api/manage-guest", async (req, res) => {
    try {
      const manageGuest = await prisma.guest.findMany({
        select: {
          guest_id: true,
          guestImage: true,
          guestName: true,
          guestRole: true,
          instagram: true,
          twitter: true,
          threads: true,
        },
      });
  
      res.status(200).json(manageGuest);
    } catch (error) {
      console.error("Error fetching guests:", error);
      res.status(500).json({ error: "Failed to fetch guests" });
    }
  });

  app.get("/api/manage-guest/:guestId", async (req, res) => {
    try {
      const { guestId } = req.params;
  
      // ✅ Find guest by ID
      const getParticularGuest = await prisma.guest.findUnique({
        where: {
          guest_id: guestId,
        },
      });
  
      // ✅ Success response
      return res.status(200).json({
        message: "Guest fetched successfully ",
        guest: getParticularGuest,
      });
    } catch (error) {
      console.error("Error fetching guest:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });
  
  



// --------------------------------
// CREATE NEW BLOG (with images)
// --------------------------------
app.post("/api/add-blogs",upload.fields([{ name: "thumbnail", maxCount: 1 },
  { name: "images", maxCount: 20 }]),async (req, res) => {
    // console.log("🟦 STEP 0: API HIT - /api/add-blogs");

    try {
      // ------------------------------------------------
      // console.log("🟨 STEP 1: RAW req.body =", req.body);
      // console.log("🟨 STEP 1: RAW req.files =", req.files);

      // 1️⃣ Extract JSON
      // console.log("🟧 STEP 2: Parsing req.body.data...");
      const { title, userId, blocks } = JSON.parse(req.body.data);

      // console.log("🟩 STEP 2 RESULT:");
      // console.log("   ➤ Title:", title);
      // console.log("   ➤ User ID:", userId);
      // console.log("   ➤ Blocks:", blocks);

      // 2️⃣ Extract THUMBNAIL
      // console.log("🟦 STEP 3: Extracting Thumbnail...");
      const thumbnailUrl = req.files.thumbnail
        ? req.files.thumbnail[0].location
        : null;

      // console.log("🟩 STEP 3 RESULT: Thumbnail URL =", thumbnailUrl);

      // 3️⃣ Extract IMAGES for blocks
      // console.log("🟦 STEP 4: Extracting Block Images...");
      const imageUploads = req.files.images
        ? req.files.images.map((f) => f.location)
        : [];

      // console.log("🟩 STEP 4 RESULT: Block Image URLs =", imageUploads);

      // 4️⃣ Build final blocks
      // console.log("🟦 STEP 5: Building finalBlocks array...");
      let imageIndex = 0;

      const finalBlocks = blocks.map((block, index) => {
        console.log(`---- Processing Block ${index} ----`);
        console.log("Block Data:", block);

        if (block.type === "image") {
          const imageUrl = imageUploads[imageIndex] || null;
          console.log(`🟡 Assigning image URL: ${imageUrl}`);
          imageIndex++;

          return {
            type: "image",
            value: null,
            imageUrl,
            order: index
          };
        }

        // console.log(`🔵 Non-image block: assigning value = ${block.value}`);
        return {
          type: block.type,
          value: block.value || null,
          imageUrl: null,
          order: index
        };
      });

      // console.log("🟩 STEP 5 RESULT: finalBlocks =", finalBlocks);

      // // 5️⃣ Create Blog in Prisma
      // console.log("🟦 STEP 6: Saving into database using Prisma...");

      const blog = await prisma.blog.create({
        data: {
          title,
          thumbnail: thumbnailUrl,
          userId,
          blocks: {
            create: finalBlocks
          }
        },
        include: { blocks: true }
      });

      // console.log("🟩 STEP 6 RESULT: Blog Saved Successfully!");
      // console.log(blog);

      return res.status(201).json({
        success: true,
        message: "Blog created successfully",
        // blog
      });

    } catch (err) {
      console.error("❌ STEP ERROR:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);


  
  // --------------------------------
  // GET ALL BLOGS
  // --------------------------------
  app.post("/api/blogs", async (req, res) => {
    try {
      const {page,limit} = req.body; // frontend sends { page, limit }
      const skip = (page - 1) * limit;
  
      const blogs = await prisma.blog.findMany({
        skip,
        take: limit,
        include: { blocks: true },
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
  });
  

  app.get("/api/blogs/:blogId", async (req, res) => {
    const { blogId } = req.params;
  
    try {
      const blog = await prisma.blog.findUnique({
        where: { blogId },
        include: { blocks: true },
      });
  
      if (!blog) {
        return res.status(404).json({ error: "Blog not found" });
      }
  
      res.json(blog);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch blog" });
    }
  });
  
  app.put(
    "/api/blogs/:blogId",
    upload.fields([
      { name: "images", maxCount: 20 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    async (req, res) => {
      const { blogId } = req.params;
      console.log("🟦 Step 1: Received request to update blog:", blogId);
  
      try {
        // Step 2: Parse request body
        console.log("🟦 Step 2: Raw request body:", req.body.data);
        const { title, blocks } = JSON.parse(req.body.data);
  
        console.log("🟦 Step 3: Parsed title:", title);
        console.log("🟦 Step 4: Parsed blocks:", blocks);
  
        // Step 5: Fetch old blog
        console.log("🟦 Step 5: Fetching old blog from DB...");
        const oldBlog = await prisma.blog.findUnique({
          where: { blogId },
          include: { blocks: true },
        });
  
        console.log("🟦 Step 6: Old blog found:", oldBlog);
  
        if (!oldBlog) {
          console.log("❌ Blog not found in DB");
          return res.status(404).json({ error: "Blog not found" });
        }
  
        // Step 7: Helper fn for S3 key extraction
        console.log("🟦 Step 7: Setting up S3 Key extractor...");
        const getS3KeyFromUrl = (url) => {
          if (!url) return null;
          try {
            const urlObj = new URL(url);
            const key = decodeURIComponent(urlObj.pathname.slice(1));
            console.log("🔑 Extracted S3 key:", key);
            return key;
          } catch (e) {
            console.log("⚠ URL parsing failed for:", url);
            return null;
          }
        };
  
        // Step 8: Check if new thumbnail uploaded
        console.log("🟦 Step 8: Checking for new thumbnail upload...");
        if (req.files?.thumbnail?.[0]) {
          console.log("🆕 New thumbnail uploaded:", req.files.thumbnail[0].location);
  
          if (oldBlog.thumbnail) {
            console.log("🟦 Step 8.1: Old thumbnail exists. Deleting...");
            const oldThumbKey = getS3KeyFromUrl(oldBlog.thumbnail);
  
            if (oldThumbKey) {
              console.log("🗑️ Deleting old thumbnail from S3:", oldThumbKey);
              await s3.send(
                new DeleteObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: oldThumbKey,
                })
              );
              console.log("✅ Old thumbnail deleted");
            }
          }
        } else {
          console.log("ℹ No new thumbnail uploaded");
        }
  
        // Step 9: Delete old block images
        console.log("🟦 Step 9: Checking old block images for deletion...");
        for (const block of oldBlog.blocks) {
          if (block.imageUrl) {
            const oldImgKey = getS3KeyFromUrl(block.imageUrl);
  
            if (oldImgKey) {
              console.log("🗑️ Deleting block image from S3:", oldImgKey);
              await s3.send(
                new DeleteObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: oldImgKey,
                })
              );
              console.log("✅ Block image deleted");
            }
          }
        }
  
        // Step 10: Process new images
        console.log("🟦 Step 10: Processing new uploaded block images...");
        const blockFiles = req.files["images"] || [];
        console.log("📤 Total new images uploaded:", blockFiles.length);
  
        let imageCounter = 0;
  
        // Step 11: Build updated blocks
        console.log("🟦 Step 11: Building updated block array...");
        const updatedBlocks = blocks.map((block, index) => {
          console.log(`➡ Processing block ${index}:`, block);
  
          if (block.type === "image") {
            if (blockFiles[imageCounter]) {
              console.log(`🖼 Assigning new image to block ${index}`);
              return {
                type: block.type,
                value: block.value || null,
                imageUrl: blockFiles[imageCounter++].location,
              };
            } else {
              console.log(`ℹ No new image for block ${index}, keeping old`);
              return {
                type: block.type,
                value: block.value || null,
                imageUrl: block.imageUrl || null,
              };
            }
          }
  
          console.log(`📝 Block ${index} is text block`);
          return {
            type: block.type,
            value: block.value || null,
            imageUrl: null,
          };
        });
  
        // Step 12: Determine new thumbnail
        console.log("🟦 Step 12: Setting final thumbnail...");
        let newThumbnail = oldBlog.thumbnail;
  
        if (req.files?.thumbnail?.[0]) {
          newThumbnail = req.files.thumbnail[0].location;
          console.log("📌 New thumbnail set:", newThumbnail);
        } else {
          console.log("📌 Keeping old thumbnail:", newThumbnail);
        }
  
        // Step 13: Update final blog in DB
        console.log("🟦 Step 13: Updating blog in Prisma...");
        const updatedBlog = await prisma.blog.update({
          where: { blogId },
          data: {
            title,
            thumbnail: newThumbnail,
            updatedAt: new Date(),
            blocks: {
              deleteMany: {},
              create: updatedBlocks,
            },
          },
          include: { blocks: true },
        });
  
        console.log("✅ Step 14: Blog updated successfully:", updatedBlog);
        res.json(updatedBlog);
      } catch (error) {
        console.error("❌ Step ERROR:", error);
        res.status(500).json({ error: "Failed to update blog" });
      }
    }
  );
  
  
  app.delete("/api/blogs/:blogId", async (req, res) => {
    const { blogId } = req.params;
  
    try {
      // Delete all related blocks first
      await prisma.block.deleteMany({
        where: { blogId },
      });
  
      // Delete the blog itself
      await prisma.blog.delete({
        where: { blogId },
      });
  
      res.json({ message: "Blog deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete blog" });
    }
  });
  


app.listen(8000,()=>{
    console.log('Valley in the Making Server Started....')
})