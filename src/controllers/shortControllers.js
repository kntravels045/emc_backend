const prisma = require("../utils/prisma")



const addShortCategory = async (req, res) => {
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
  }

  
const updatedShortCategory =  async (req, res) => {
  try {
    const { shortCategoryId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    const updatedCategory = await prisma.shortCategory.update({
      where: { shortCategoryId },
      data: { name },
    });

    res.status(200).json({
      message: "Short category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating short category:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


const deleteShortCategory = async (req, res) => {
  try {
    const { shortCategoryId } = req.params;

    await prisma.shortCategory.delete({
      where: { shortCategoryId },
    });

    res.status(200).json({
      message: "Short deleted successfully",
    });
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(409).json({
        message: "Category has Shorts and cannot be deleted",
      });
    }
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

const addShorts= async (req, res) => {
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
  }

const editShorts = async (req, res) => {
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
  }

const deleteShorts =  async (req, res) => {
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
  }

const getAllShorts = async (req, res) => {
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
  }

const getShortsByPagination =  async (req, res) => {
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
  }

  module.exports = {
    addShortCategory,
    updatedShortCategory,
    deleteShortCategory,
    addShorts,
    editShorts,
    deleteShorts,
    getAllShorts,
    getShortsByPagination
  }