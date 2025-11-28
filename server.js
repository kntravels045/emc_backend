const express = require("express");
const authRoutes = require("./src/routes/authRoutes");
const videoRoutes = require("./src/routes/videoRoutes")
const shortRoutes = require("./src/routes/shortRoutes")
const guestRoutes = require("./src/routes/guestRoutes")
const blogsRoutes = require("./src/routes/blogsRoutes")
const app = express();
const cookieParser = require('cookie-parser')

app.use(cors({
    credentials: true
  }));
app.use(express.json());
app.use(cookieParser())

app.use("/api/auth",authRoutes)
app.use("/api/shorts",shortRoutes)
app.use("/api/video",videoRoutes)
app.use("/api/manage-guest",guestRoutes)
app.use("/api/blogs",blogsRoutes)

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
