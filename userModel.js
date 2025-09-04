const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- AÑADE ESTA LÍNEA ---
  name: { 
    type: String, 
    required: true 
  },
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },

  foraneo: { 
    type: Boolean, 
    default: false,
    timestamps: true }
  
});

module.exports = mongoose.model('User', userSchema);