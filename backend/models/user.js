const mongoose = require ("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true
    , unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  born: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['cliente', 'admin'],
    default: 'cliente'
  }
}, { timestamps: true });

module.exports = mongoose.model("user", UserSchema);
