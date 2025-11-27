// ==================== SERVER.JS ====================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== DATABASE ====================
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studyhub';

mongoose.connect(mongoURI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ==================== MODELS ====================
// Subject model
const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String
});
const Subject = mongoose.model('Subject', SubjectSchema);

// Resource model
const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  downloads: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }
});
const Resource = mongoose.model('Resource', ResourceSchema);

// ==================== ROUTES ====================
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ==================== SUBJECT ROUTES ====================
// Get all subjects
app.get('/api/subject', async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single subject
app.get('/api/subject/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new subject
app.post('/api/subject', async (req, res) => {
  try {
    const newSubject = new Subject(req.body);
    const saved = await newSubject.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update subject
app.put('/api/subject/:id', async (req, res) => {
  try {
    const updated = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Subject not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete subject
app.delete('/api/subject/:id', async (req, res) => {
  try {
    const deleted = await Subject.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Subject not found' });
    res.json({ success: true, message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== RESOURCE ROUTES ====================
// Get all resources
app.get('/api/resources', async (req, res) => {
  try {
    const resources = await Resource.find().populate('subject');
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single resource
app.get('/api/resources/:id', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id).populate('subject');
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new resource
app.post('/api/resources', async (req, res) => {
  try {
    const newResource = new Resource(req.body);
    const saved = await newResource.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update resource
app.put('/api/resources/:id', async (req, res) => {
  try {
    const updated = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Resource not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete resource
app.delete('/api/resources/:id', async (req, res) => {
  try {
    const deleted = await Resource.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Resource not found' });
    res.json({ success: true, message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STATS ROUTE ====================
app.get('/api/stats', async (req, res) => {
  try {
    const subjectCount = await Subject.countDocuments();
    const resourceCount = await Resource.countDocuments();

    const totalDownloadsAgg = await Resource.aggregate([
      { $group: { _id: null, total: { $sum: '$downloads' } } }
    ]);

    const totalViewsAgg = await Resource.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);

    res.json({
      success: true,
      stats: {
        subjects: subjectCount,
        resources: resourceCount,
        downloads: totalDownloadsAgg[0]?.total || 0,
        views: totalViewsAgg[0]?.total || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 404 ====================
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));