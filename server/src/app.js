const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for generated certificates)
app.use('/generated', express.static(path.join(__dirname, '../generated')));

// Routes
const certificateRoutes = require('./routes/certificateRoutes');
app.use('/api', certificateRoutes);

app.get('/', (req, res) => {
  res.send('Certificate Generator API is running');
});

module.exports = app;
