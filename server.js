const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Sandydb456:Sandydb456@cluster0.o4lr4zd.mongodb.net/project_booking?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

// Project Schema
const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    description: { type: String, required: true },
    projectType: { type: String, required: true },
    projectCategory: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Submit project
app.post('/api/submit-project', async (req, res) => {
    try {
        const { name, phone, description, projectType, projectCategory } = req.body;
        
        const newProject = new Project({
            name,
            phone,
            description,
            projectType,
            projectCategory
        });

        await newProject.save();
        res.status(201).json({ message: 'Project submitted successfully!' });
    } catch (error) {
        console.error('Error submitting project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all projects (for admin)
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update project status
app.put('/api/projects/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(project);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
