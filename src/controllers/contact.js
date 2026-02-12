const prisma = require("../utils/prisma")


const contactForm = async (req, res) => {
    try {
      const {
        fullName,
        emailAddress,
        phoneNumber,
        linkedInPortfolio,
        connectionPreference,
        storyOrTopic,
      } = req.body;
  
    // Basic validation (you can extend this)
    //   if (!fullName || !emailAddress || !phoneNumber || !connectionPreference) {
    //     return res.status(400).json({ message: 'Missing required fields' });
    //   }
  
      // Save to database
      const submission = await prisma.podcastFormSubmission.create({
        data: {
          fullName,
          emailAddress,
          phoneNumber,
          linkedInPortfolio,
          connectionPreference,
          storyOrTopic,
        },
      });
  
      return res.status(201).json({ message: 'Form submitted successfully', submission });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  }

  const getContactDetails = async (req, res) => {
    try {
      const { page , limit } = req.query;
  
      const pageNumber = parseInt(page);
      const limitNumber = parseInt(limit);
  
      const skip = (pageNumber - 1) * limitNumber;
  
      // Get total count
      const total = await prisma.podcastFormSubmission.count();
  
      // Fetch paginated data
      const submissions = await prisma.podcastFormSubmission.findMany({
        skip: skip,
        take: limitNumber,
        orderBy: {
          createdAt: "desc",
        },
      });
  
      return res.status(200).json({
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
        submissions,
      });
  
    } catch (error) {
      console.error("Error fetching contact details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };
  
  const deletePodcastSubmission = async (req, res) => {
    try {
      const { submissionId } = req.params;
  
      await prisma.podcastFormSubmission.delete({
        where: { submissionId },
      });
  
      return res.status(200).json({
        message: "Submission deleted successfully",
      });
  
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Submission not found" });
      }
  
      console.error("Error deleting submission:", error);
      return res.status(500).json({ message: "Server error" });
    }
  };
  

module.exports = {getContactDetails,contactForm,deletePodcastSubmission}