const express = require("express");
const authRoutes = require("./src/routes/authRoutes");
const videoRoutes = require("./src/routes/videoRoutes")
const shortRoutes = require("./src/routes/shortRoutes")
const guestRoutes = require("./src/routes/guestRoutes")
const blogsRoutes = require("./src/routes/blogsRoutes")
const contactForm = require("./src/routes/contact")
const cors = require('cors')
const dotenv = require('dotenv')
const app = express();
const cookieParser = require('cookie-parser')
dotenv.config();


// app.get('/health', async (req, res) => {
//   try {
//     await prisma.$queryRaw`SELECT 1`; // DB connection check

//     res.status(200).json({
//       status: "OK",
//       server: "Running",
//       database: "Connected",
//       timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//     });

//   } catch (error) {
//     res.status(500).json({
//       status: "ERROR",
//       server: "Running",
//       database: "Disconnected",
//       message: "Database connection failed",
//       error: error.message,
//       timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
//     });
//   }
// });


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://valleyinthemaking.netlify.app"
    ],
    credentials: true,
  })
);
app.use(express.json())
app.use(cookieParser())


app.use("/",authRoutes)
app.use("/",shortRoutes)
app.use("/",videoRoutes)
app.use("/",guestRoutes)
app.use("/",blogsRoutes)
app.use("/",contactForm)


const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
