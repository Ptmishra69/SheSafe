const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect("mongodb://127.0.0.1:27017/shesafe", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected to SheSafe"))
.catch(err => console.error("❌ MongoDB error:", err));

app.use("/api/auth", authRoutes);


// In-memory data (temporary "database")
let reports = [];
let redZones = [];

// --- Helper: distance between two coordinates (in km) ---
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- Detect red zone ---
function checkForRedZone(latitude, longitude) {
  const nearbyReports = reports.filter((r) => {
    const distance = getDistance(latitude, longitude, r.latitude, r.longitude);
    return distance <= 1.5; // within 1.5 km
  });

  console.log('📊 Nearby reports count:', nearbyReports.length);

  if (nearbyReports.length >= 3) {
    const existingZone = redZones.find((z) => {
      const d = getDistance(latitude, longitude, z.latitude, z.longitude);
      return d < 0.5; // already red zone nearby
    });

    if (!existingZone) {
      const newZone = {
        id: redZones.length + 1,
        latitude,
        longitude,
        reportCount: nearbyReports.length,
        createdAt: new Date().toISOString(),
      };
      redZones.push(newZone);
      console.log('🚨 New Red Zone Created:', newZone);
    }
    return true;
  }

  return false;
}

// --- POST: Add a new report ---
app.post('/api/reports', (req, res) => {
  const { userName, description, latitude, longitude } = req.body;
  if (!userName || !description || !latitude || !longitude) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const newReport = {
    id: reports.length + 1,
    userName,
    description,
    latitude,
    longitude,
    date: new Date().toISOString(),
  };

  reports.push(newReport);
  console.log('✅ New report added:', newReport);

  console.log('🧭 Checking for red zone near:', latitude, longitude);
  const isDangerous = checkForRedZone(latitude, longitude);
  console.log('⚙️ Red zone check result:', isDangerous);

  res.status(201).json({
    message: isDangerous
      ? '⚠️ This area is now marked as a Red Zone!'
      : '✅ Report added successfully',
    report: newReport,
    totalReports: reports.length,
    totalRedZones: redZones.length,
  });
});

// --- GET: All reports ---
app.get('/api/reports', (req, res) => res.json(reports));

// --- GET: All red zones ---
app.get('/api/redzones', (req, res) => res.json(redZones));

// --- GET: Check if coordinates are in a red zone ---
app.get('/api/check-zone', (req, res) => {
  const { latitude, longitude } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Coordinates required' });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const danger = redZones.some(
    (z) => getDistance(lat, lon, z.latitude, z.longitude) < 0.5
  );

  res.json({
    latitude: lat,
    longitude: lon,
    isRedZone: danger,
    message: danger
      ? '🚨 Warning! You are in a Red Zone area.'
      : '✅ This area is safe so far.',
  });
});

// --- Root route ---
app.get('/', (req, res) => res.send('✅ SheSafe backend with Red Zone Detection is running!'));

const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
