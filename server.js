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

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

const bookingSchema = new mongoose.Schema({
  name: String,
  gender: String,
  phone: String,
  studyField: String,
  heardAbout: String,
  idea: String,
  email: String
});
const Booking = mongoose.model("Booking", bookingSchema);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post("/submit", async (req, res) => {
  try {
    const { name, gender, phone, studyField, heardAbout, idea, email } = req.body;

    const booking = new Booking({ name, gender, phone, studyField, heardAbout, idea, email });
    await booking.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "🚀 New Project Booking",
      text: `
New Project Booking Received

Name: ${name}
Gender: ${gender}
Phone: ${phone}
Email: ${email}
Study Field: ${studyField}
Heard About: ${heardAbout}
Project Idea: ${idea}
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "✅ Submitted successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Submission failed." });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`)
);
