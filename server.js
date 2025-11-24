// ==================== SERVER.JS ====================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== DATABASE ====================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyhub', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// ==================== MODELS ====================
// Subject Model
const subjectSchema = new mongoose.Schema({
  name: String,
  slug: String,
  icon: String,
  category: String,
  description: String,
  resourceCount: { type: Number, default: 0 }
}, { timestamps: true });

const Subject = mongoose.model('Subject', subjectSchema);

// Resource Model
const resourceSchema = new mongoose.Schema({
  name: String,
  subject: String,
  type: String, // past-papers, notes, videos, textbooks, quizzes
  description: String,
  link: String,
  fileSize: String,
  year: Number,
  downloads: { type: Number, default: 0 },
  views: { type: Number, default: 0 }
}, { timestamps: true });

const Resource = mongoose.model('Resource', resourceSchema);

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ==================== SUBJECTS ROUTES ====================

// Get all subjects
app.get('/api/subjects', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category && category !== 'all') query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    const subjects = await Subject.find(query).sort({ name: 1 });
    res.json({ success: true, count: subjects.length, subjects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single subject
app.get('/api/subjects/:slug', async (req, res) => {
  try {
    const subject = await Subject.findOne({ slug: req.params.slug });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create subject
app.post('/api/subjects', async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update subject
app.put('/api/subjects/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete subject
app.delete('/api/subjects/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, message: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== RESOURCES ROUTES ====================

// Get all resources
app.get('/api/resources', async (req, res) => {
  try {
    const { subject, type, year, search, page = 1, limit = 20 } = req.query;
    let query = {};
    if (subject) query.subject = subject;
    if (type) query.type = type;
    if (year) query.year = parseInt(year);
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];

    const skip = (page - 1) * limit;
    const resources = await Resource.find(query).sort({ createdAt: -1 }).limit(parseInt(limit)).skip(skip);
    const total = await Resource.countDocuments(query);

    res.json({
      success: true,
      count: resources.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      resources
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single resource
app.get('/api/resources/:id', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    resource.views += 1;
    await resource.save();

    res.json({ success: true, resource });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create resource
app.post('/api/resources', async (req, res) => {
  try {
    const resource = await Resource.create(req.body);
    await Subject.findOneAndUpdate({ name: resource.subject }, { $inc: { resourceCount: 1 } });
    res.status(201).json({ success: true, resource });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update resource
app.put('/api/resources/:id', async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });
    res.json({ success: true, resource });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete resource
app.delete('/api/resources/:id', async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });
    await Subject.findOneAndUpdate({ name: resource.subject }, { $inc: { resourceCount: -1 } });
    res.json({ success: true, message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Track download
app.post('/api/resources/:id/download', async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    resource.downloads += 1;
    await resource.save();

    res.json({ success: true, downloads: resource.downloads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== STATS ====================
app.get('/api/stats', async (req, res) => {
  try {
    const subjectCount = await Subject.countDocuments();
    const resourceCount = await Resource.countDocuments();
    const totalDownloads = await Resource.aggregate([{ $group: { _id: null, total: { $sum: '$downloads' } } }]);
    const totalViews = await Resource.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);

    res.json({
      success: true,
      stats: {
        subjects: subjectCount,
        resources: resourceCount,
        downloads: totalDownloads[0]?.total || 0,
        views: totalViews[0]?.total || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== SERVE REACT FRONTEND ====================
app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
