// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // You need to download this from Firebase

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve static files from current directory

// MongoDB connection
const MONGODB_URI = "mongodb+srv://Sandydb456:Sandydb456@cluster0.o4lr4zd.mongodb.net/projectbooking?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schemas
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  budget: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectName: { type: String, required: true },
  date: { type: Date, required: true },
  duration: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// PROJECT ROUTES

// Get all projects for authenticated user
app.get('/api/projects', verifyToken, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.uid }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
app.get('/api/projects/:id', verifyToken, async (req, res) => {
  try {
    const project = await Project.findOne({ 
      _id: req.params.id, 
      userId: req.user.uid 
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create new project
app.post('/api/projects', verifyToken, async (req, res) => {
  try {
    const { name, description, startDate, endDate, budget, status } = req.body;
    
    const project = new Project({
      name,
      description,
      startDate,
      endDate,
      budget,
      status: status || 'pending',
      userId: req.user.uid
    });
    
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
app.put('/api/projects/:id', verifyToken, async (req, res) => {
  try {
    const { name, description, startDate, endDate, budget, status } = req.body;
    
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid },
      {
        name,
        description,
        startDate,
        endDate,
        budget,
        status,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
app.delete('/api/projects/:id', verifyToken, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.uid 
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Also delete associated bookings
    await Booking.deleteMany({ projectId: req.params.id });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// BOOKING ROUTES

// Get all bookings for authenticated user
app.get('/api/bookings', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.uid })
      .populate('projectId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get single booking
app.get('/api/bookings/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      _id: req.params.id, 
      userId: req.user.uid 
    }).populate('projectId');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create new booking
app.post('/api/bookings', verifyToken, async (req, res) => {
  try {
    const { projectId, date, duration, status } = req.body;
    
    // Verify project exists and belongs to user
    const project = await Project.findOne({ 
      _id: projectId, 
      userId: req.user.uid 
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const booking = new Booking({
      projectId,
      projectName: project.name,
      date,
      duration,
      status: status || 'pending',
      userId: req.user.uid
    });
    
    await booking.save();
    
    // Update project status if needed
    if (project.status === 'pending') {
      project.status = 'active';
      await project.save();
    }
    
    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking
app.put('/api/bookings/:id', verifyToken, async (req, res) => {
  try {
    const { date, duration, status } = req.body;
    
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid },
      {
        date,
        duration,
        status
      },
      { new: true }
    ).populate('projectId');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Delete booking
app.delete('/api/bookings/:id', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.uid 
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// DASHBOARD STATS
app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.uid });
    const bookings = await Booking.find({ userId: req.user.uid });
    
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const pendingProjects = projects.filter(p => p.status === 'pending').length;
    const totalBookings = bookings.length;
    
    res.json({
      activeProjects,
      completedProjects,
      pendingProjects,
      totalBookings
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});

module.exports = app;
