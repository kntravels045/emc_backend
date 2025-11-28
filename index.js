const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const app = express()
const s3 = require('./s3Client')
const config = require('./config');
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const upload = require("./multer.js");
dotenv.config();
app.use(cors({
  origin: 'https://emc-backend.onrender.com',  // frontend origin
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())


// Correct S3 Client
const s3Client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  }
}
)

//console.log(process.env.ACCESS_SECRET)

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // DB connection check

    res.status(200).json({
      status: "OK",
      server: "Running",
      database: "Connected",
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    });

  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      server: "Running",
      database: "Disconnected",
      message: "Database connection failed",
      error: error.message,
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    });
  }
});




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
        where: { email: data.email },
      });
  
      if (!user)
        return res.status(400).json({ message: "Invalid credentials" });
  
      const isMatch = await bcrypt.compare(data.password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });
  
      // 🔥 “Remember Me” Logic
      const remember = data.rememberMe === true;
  
      const accessExpiry = remember ? "7d" : "30s";
      const refreshExpiry = remember ? "30d" : "60s";
      // const accessExpiry = remember ? "7d" : "30m";
      // const refreshExpiry = remember ? "30d" : "1d";
  
      console.log("Remember Me:", remember);
      console.log("Access Expiry:", accessExpiry);
      console.log("Refresh Expiry:", refreshExpiry);
  
      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.userId },
        process.env.ACCESS_SECRET,
        { expiresIn: accessExpiry }
      );
  
      const refreshToken = jwt.sign(
        { userId: user.userId },
        process.env.ACCESS_SECRET,
        { expiresIn: refreshExpiry }
      );
  
      // Save refresh token in DB
      await prisma.user.update({
        where: { userId: user.userId },
        data: { refreshToken: refreshToken },
      });
  
      // Send refresh token in cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: remember
          ? 30 * 24 * 60 * 60 * 1000 // 30 days
          //: 24 * 60 * 60 * 1000,     // 1 day
          : 30 * 1000,
      });
  
      // Response
      res.json({
        accessToken,
        userId: user.userId,
        rememberMe: remember,
        message: "Login successful",
      });
  
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
  app.post("/api/add/video-category",authenticateToken, async (req, res) => {
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

  
  app.post("/api/add/episode-video",authenticateToken, async (req, res) => {
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
  });//amose
  
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
  });//amose

app.put("/api/video/:videoId",authenticateToken, async (req, res) => {
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

app.delete("/api/video/:videoId",authenticateToken, async (req, res) => {
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
  
// ✅ Create Short Category
  app.post("/api/add/short-category",authenticateToken, async (req, res) => {
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

  app.post("/api/add/shorts-video",authenticateToken, async (req, res) => {
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


  app.put("/api/shorts/:shortId",authenticateToken, async (req, res) => {
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

  app.delete("/api/shorts/:shortId",authenticateToken, async (req, res) => {
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
  });//amose
  
  
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
  });//amose
  
//////////////////////////////////////////////////
// addingGuestRoute

app.post("/api/add-guest",authenticateToken,upload.single("guestImage"),async (req, res) => {
    try {
      const {
        guestName,guestRole,aboutGuest,instagram,twitter,threads,headingOne,descriptionOne,headingTwo,descriptionTwo,
        headingthree,descriptionThree,youtubeLink,userId,
      } = req.body;

     

      const imageUrl = req.file.location

      // ✅ Validation check
      if (
        !guestName || !guestRole || !aboutGuest ||
        !headingOne || !descriptionOne || !headingTwo || !descriptionTwo || !headingthree ||
        !descriptionThree || !youtubeLink || !userId
      ) {
        return res.status(400).json({ message: "All required fields must be filled." });
      }

  
      // ✅ Create new guest
      const newGuest = await prisma.guest.create({
        data: {
         guestImage: imageUrl, // Cloudinary URL
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
  });//amose

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
  });//amose

  app.put("/api/manage-guest/:guestId",authenticateToken,upload.single("guestImage"), async (req, res) => {
    console.log("🟡 PUT /api/manage-guest/:guestId called");
  
    try {
      const { guestId } = req.params;
  
      // Destructure all guest fields from the request body
      const {
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
  
    // Fetch existing guest
    const guest = await prisma.guest.findUnique({
      where: { guest_id: guestId },
    });

    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    let imageUrl = guest.guestImage;

    // 📌 Only if new image uploaded
    if (req.file) {
      console.log("🆕 New image uploaded");

      // delete old image
      if (guest.guestImage) {
        console.log("🖼 Deleting old S3 image:", guest.guestImage);

        const oldPhotoUrl = guest.guestImage;
        const decodedKey = decodeURIComponent(oldPhotoUrl.split("/").pop());
        const fileKey = decodedKey.startsWith("Dashboard/")
          ? decodedKey
          : `Dashboard/${decodedKey}`;

        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: config.S3_BUCKET_NAME,
            Key: fileKey,
          })
        );
        console.log("🟢 Old image deleted from S3");
      }

      // Upload new image
      imageUrl = req.file.location;
    }

    // Update DB
    const updatedGuest = await prisma.guest.update({
      where: { guest_id: guestId },
      data: {
        guestImage: imageUrl,
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

    console.log("🟢 Guest updated in DB");

    return res.status(200).json({
      message: "Guest updated successfully",
      guest: updatedGuest,
    });
  } catch (error) {
    console.error("❌ UPDATE ERROR:", error);
    return res.status(500).json({
      message: "Failed to update guest",
      error: error.message,
    });
  }
}
);



  app.delete("/api/manage-guest/:guestId",authenticateToken, async (req, res) => {

  console.log("🟡 DELETE /api/manage-guest/:guestId called");

  try {
    const { guestId } = req.params;

    // Fetch guest
    const guest = await prisma.guest.findUnique({
      where: { guest_id: guestId },
    });

    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    // ----------------------------------------------------
    // 1️⃣ DELETE THE IMAGE FROM S3
    // ----------------------------------------------------
    if (guest.guestImage) {
      console.log("🖼 Deleting S3 image:", guest.guestImage);

      const photoUrl = guest.guestImage;

      // Extract filename
      const decodedKey = decodeURIComponent(photoUrl.split("/").pop());
      const fileKey = decodedKey.startsWith("Dashboard/")
        ? decodedKey
        : `Dashboard/${decodedKey}`;

      console.log("📌 Final S3 delete key:", fileKey);

      const deleteParams = {
        Bucket: config.S3_BUCKET_NAME,
        Key: fileKey,
      };
 console.log( "delete1",deleteParams)
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      console.log("delete2",deleteCommand)

      const deleteResponse = await s3Client.send(deleteCommand);
      console.log("delete3",deleteResponse)

      console.log("🟢 S3 delete response:", deleteResponse);
    }

    // ----------------------------------------------------
    // 2️⃣ DELETE GUEST FROM DATABASE
    // ----------------------------------------------------
    await prisma.guest.delete({
      where: { guest_id: guestId },
    });

    console.log("🟢 Guest deleted from DB");

    return res.status(200).json({
      message: "Guest deleted successfully",
      deletedGuestId: guestId,
    });

  } catch (error) {
    console.error("❌ DELETE ERROR:", error);
    return res.status(500).json({
      message: "Failed to delete guest",
      error: error.message,
    });
  }
  });



app.post("/api/add-blogs",authenticateToken,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 50 },
  ]),
  async (req, res) => {
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
);


  app.get("/api/blogs", async (req, res) => {
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
  });//amose

  
app.post("/api/blogs",authenticateToken, async (req, res) => {
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
});

app.get("/api/blogs/:blogId",authenticateToken, async (req, res) => {
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
});

app.get("/api/blogs/:blogId/similar", async (req, res) => {
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
});//amose






app.put(
  "/api/blogs/:blogId",authenticateToken,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 50 },
  ]),
  async (req, res) => {
    try {
      const { title, author, content } = req.body;
      const parsedContent = JSON.parse(content);

      let thumbnail = undefined;

      if (req.files["thumbnail"]) {
        thumbnail = `${req.files["thumbnail"][0].location}`;
      }

      if (req.files["images"]) {
        req.files["images"].forEach((img, index) => {
          const block = parsedContent.find(
            (b) => b.type === "image" && b.value == index
          );
          if (block) block.value = `${img.location}`;
        });
      }

      const updated = await prisma.blog.update({
        where: { blogId: req.params.blogId },
        data: {
          title,
          author,
          ...(thumbnail && { thumbnail }),
          content: parsedContent,
        },
      });

      res.json(updated);
    } catch (err) {
      console.log("PUT ERROR", err);
      res.status(500).json({ error: "Failed to update blog" });
    }
  }
);



// app.put(
//   "/api/blogs/:blogId",
//   upload.fields([
//     { name: "thumbnail", maxCount: 1 },
//     { name: "images", maxCount: 50 },
//   ]),
//   async (req, res) => {
//     console.log("🟡 PUT update blog API called");

//     try {
//       const blogId = req.params.blogId;
//       console.log("👉 blogId:", blogId);

//       console.log("🔍 Fetching existing blog...");
//       const oldBlog = await prisma.blog.findUnique({
//         where: { blogId },
//       });

//       console.log("📄 Old blog data:", oldBlog);

//       const { title, author, content } = req.body;
//       const parsedContent = JSON.parse(content);

//       let newThumbnail = undefined;

//       // -------------------------------------------
//       // DELETE OLD THUMBNAIL IF NEW ONE UPLOADED
//       // -------------------------------------------
//       if (req.files["thumbnail"]) {
//         console.log("🖼 New thumbnail uploaded!");

//         if (oldBlog.thumbnail) {
//           console.log("🗑 Deleting OLD thumbnail:", oldBlog.thumbnail);

//           const oldKey = decodeURIComponent(oldBlog.thumbnail.split("/").pop());
//           const finalOldKey = oldKey.startsWith("Dashboard/")
//             ? oldKey
//             : `Dashboard/${oldKey}`;

//           console.log("📌 OLD S3 Key:", finalOldKey);

//           await s3.send(
//             new DeleteObjectCommand({
//               Bucket: process.env.S3_BUCKET_NAME,
//               Key: finalOldKey,
//             })
//           );

//           console.log("✔ Old thumbnail deleted");
//         }

//         newThumbnail = req.files["thumbnail"][0].location;
//         console.log("👉 New thumbnail:", newThumbnail);
//       }

//       // ---------------------------------------------------------
//       // DELETE OLD BLOCK IMAGE IF NEW ONE UPLOADED FOR THAT BLOCK
//       // ---------------------------------------------------------
//       if (req.files["images"]) {
//         console.log("🖼 Checking block images...");
//         console.log("📸 New block images found:", req.files["images"].length);

//         req.files["images"].forEach((img, index) => {
//           console.log("🔄 Processing new image index:", index);

//           // find block to replace
//           const block = parsedContent.find(
//             (b) => b.type === "image" && b.value == index
//           );

//           if (block) {
//             // find old image URL in oldBlog.content
//             const oldBlock = oldBlog.content.find(
//               (b) => b.type === "image" && b.value == block.value
//             );

//             if (oldBlock) {
//               console.log("🗑 Deleting OLD block image:", oldBlock.value);

//               const oldImgKey = decodeURIComponent(oldBlock.value.split("/").pop());
//               const finalOldImgKey = oldImgKey.startsWith("Dashboard/")
//                 ? oldImgKey
//                 : `Dashboard/${oldImgKey}`;

//               console.log("📌 OLD block S3 Key:", finalOldImgKey);

//               s3.send(
//                 new DeleteObjectCommand({
//                   Bucket: process.env.S3_BUCKET_NAME,
//                   Key: finalOldImgKey,
//                 })
//               );
//             }

//             // update with new image URL
//             block.value = img.location;
//             console.log("✔ Updated block with new image:", block.value);
//           }
//         });
//       }

//       // -----------------------------------------------------
//       // UPDATE BLOG IN DATABASE
//       // -----------------------------------------------------
//       console.log("📝 Updating blog in database...");

//       const updated = await prisma.blog.update({
//         where: { blogId },
//         data: {
//           title,
//           author,
//           ...(newThumbnail && { thumbnail: newThumbnail }),
//           content: parsedContent,
//         },
//       });

//       console.log("✅ Blog updated successfully!");
//       res.json(updated);

//     } catch (err) {
//       console.log("❌ PUT ERROR:", err);
//       res.status(500).json({ error: "Failed to update blog" });
//     }
//   }
// );



app.delete("/api/blogs/:blogId",authenticateToken, async (req, res) => {
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
          Bucket: process.env.S3_BUCKET_NAME,
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
});



app.listen(8000,()=>{
    console.log('Valley in the Making Server Started....')
})