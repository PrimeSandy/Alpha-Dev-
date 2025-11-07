import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (your frontend)
app.use(express.static(__dirname));

// MongoDB connection
const uri = "mongodb+srv://Sandydb456:Sandydb456@cluster0.o4lr4zd.mongodb.net/project_booking?retryWrites=true&w=majority";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// Booking Schema
const bookingSchema = new mongoose.Schema({
  name: String,
  education: String,
  found: String,
  when: String,
  type: String,
  idea: String,
  createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model("Booking", bookingSchema);

// Routes
app.post("/submit", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.json({ success: true, message: "Booking saved" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error saving booking" });
  }
});

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));
