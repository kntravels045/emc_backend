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

const addGuest  = async (req, res) => {
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
}

const manageGuest = async (req, res) => {
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
}

const manageGuestById = async (req, res) => {
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
}

const updateManageGuest = async (req, res) => {
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

const deleteManageGuest = async (req, res) => {

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
}
  

module.exports = {
    addGuest,
    manageGuest,
    manageGuestById,
    updateManageGuest,
    deleteManageGuest
}