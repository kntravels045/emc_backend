const prisma = require("../utils/prisma")
const config = require('../../config');
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = new S3Client({
    region: config.AWS_REGION,
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    }
  })

const addCategory =  async (req, res) => {
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
  }

const addVideo =  async (req, res) => {
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
  }

const getAllVideo = async (req, res) => {
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
  }

const getVideoByPagination = async (req, res) => {
    try {
      const { categoryId, page = 1, limit = 1 } = req.query;
  
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
  }

const editVideo =   async (req, res) => {
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
  }

const deleteVideo = async (req, res) => {
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
  }

module.exports={
    addCategory,
    addVideo,
    getAllVideo,
    getVideoByPagination,
    editVideo,
    deleteVideo
}