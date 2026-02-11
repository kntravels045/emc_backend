const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const prisma = require("../utils/prisma")
const config = require("../../config")
const isProd =  config.NODE_ENV === "production";

const register =  async (req, res) => {
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
}

 const login = async (req, res) => {
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
  
      const accessExpiry = remember ? "7d" : "30m";
      const refreshExpiry = remember ? "30d" : "1d";
  
      // console.log("Remember Me:", remember);
      // console.log("Access Expiry:", accessExpiry);
      // console.log("Refresh Expiry:", refreshExpiry);
  
      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user.userId },
        config.ACCESS_SECRET,
        { expiresIn: accessExpiry }
      );
  
      const refreshToken = jwt.sign(
        { userId: user.userId },
        config.ACCESS_SECRET,
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
        secure: isProd,                 // false in dev, true in prod
        sameSite: isProd ? "none" : "lax",
        maxAge: remember
          ? 30 * 24 * 60 * 60 * 1000 // 30 days
          : 24 * 60 * 60 * 1000,     // 1 day
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
}


const refresh = async (req, res) => {
    try {
      const { refreshToken} = req.cookies;
      if (!refreshToken) {
        return res.status(401).json({ message: "No token found" });
      }
  
      // ✅ Verify refresh token using correct secret
      const decoded = jwt.verify(refreshToken, config.ACCESS_SECRET);
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
        config.ACCESS_SECRET,
        { expiresIn: "30s" }
      );
  
      res.json({ accessToken: newAccessToken });
    } catch (err) {
      console.error(err);
      res.status(403).json({ message: "Invalid or expired refresh token" });
    }
}

const logout = async (req, res) => {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) return res.sendStatus(204);
  
      const decoded = jwt.verify(refreshToken, config.ACCESS_SECRET);
  
      // Clear refresh token in DB
      await prisma.user.update({
        where: { userId: decoded.userId },
        data: { refreshToken: null },
      });
  
      res.clearCookie("refreshToken"); 
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
}

module.exports = 
{
    register,
    login,
    refresh,
    logout
}