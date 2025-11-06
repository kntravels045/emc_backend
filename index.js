const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { PrismaClient } = require('@prisma/client')
const app = express()
const prisma = new PrismaClient()
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
app.put("/api/video/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      const { title, description, embedUrl, categoryId } = req.body;
  
      const updatedVideo = await prisma.video.update({
        where: { videoId },
        data: {
          title,
          description,
          embedUrl,
          videoCategoryId: categoryId,
        },
      });
  
      return res.status(200).json({
        message: "Video updated successfully",
        video: updatedVideo,
      });
    } catch (error) {
      console.error("Error updating video:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  });

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
  
      return res.status(200).json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      return res.status(500).json({ message: "Internal Server Error", error: error.message });
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
  
  
    
  



app.listen(8000,()=>{
    console.log('Valley in the Making Server Started....')
})