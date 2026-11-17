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
  passwordResetToken: {
    type: String,
    default: undefined,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    default: undefined,
    select: false
  },
  born: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  fotoPerfil: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['cliente', 'admin', 'superadmin'],
    default: 'cliente'
  }
}, { timestamps: true });

module.exports = mongoose.model("user", UserSchema);
