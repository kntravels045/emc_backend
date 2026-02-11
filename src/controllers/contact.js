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
      if (!fullName || !emailAddress || !phoneNumber || !connectionPreference) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
  
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
      // Fetch all podcast form submissions from the database
      const submissions = await prisma.podcastFormSubmission.findMany();
  
      // Return the fetched data with a 200 OK status
      return res.status(200).json({ submissions });
    } catch (error) {
      console.error('Error fetching contact details:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
  



module.exports = {getContactDetails,contactForm}