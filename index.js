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

app.use("/api",authRoutes)
app.use("/api",shortRoutes)
app.use("/api",videoRoutes)
app.use("/api",guestRoutes)
app.use("/api",blogsRoutes)
app.use("/api",contactForm)

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
