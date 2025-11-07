import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/project-booking")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Enhanced Booking Schema
const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: String,
  phone: { type: String, required: true },
  studyField: String,
  heardAbout: String,
  idea: String,
  email: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", bookingSchema);

// Email transporter with better configuration
const transporter = nodemailer.createTransporter({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify email configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Email configuration error:", error);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

// Enhanced submission endpoint
app.post("/submit", async (req, res) => {
  try {
    const { name, gender, phone, studyField, heardAbout, idea, email } = req.body;

    // Basic validation
    if (!name || !phone || !email) {
      return res.status(400).json({ 
        message: "❌ Please fill in all required fields: Name, Phone, and Email." 
      });
    }

    // Create and save booking
    const booking = new Booking({ 
      name, 
      gender, 
      phone, 
      studyField, 
      heardAbout, 
      idea, 
      email 
    });
    
    await booking.save();

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "🚀 New Project Booking - Alpha Developers",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">New Project Booking Received</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Gender:</strong> ${gender || 'Not specified'}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Study Field:</strong> ${studyField || 'Not specified'}</p>
            <p><strong>Heard About:</strong> ${heardAbout || 'Not specified'}</p>
            <p><strong>Project Idea:</strong></p>
            <p style="background: white; padding: 10px; border-radius: 4px; border-left: 4px solid #4F46E5;">
              ${idea || 'No details provided'}
            </p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ 
      message: "✅ Thank you! Your project has been submitted successfully. We'll contact you soon." 
    });
    
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ 
      message: "❌ Server error. Please try again later or contact support." 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString()
  });
});

// Serve the main page for all other routes (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
