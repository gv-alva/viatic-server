// --- 1. IMPORTACIONES ---
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const User = require('./userModel');
const viaticosRoutes = require('./viaticosRoutes');

// --- 2. CONFIGURACIÓN INICIAL ---
const app = express();
const PORT = process.env.PORT || 4000;

// --- 3. MIDDLEWARE ---
const allowedOrigins = [
  'http://localhost:5173',        // dev local (Vite)
  'https://viatic-app.vercel.app' // <-- SIN slash final
];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => res.json({ ok: true }));

// --- 4. CONEXIÓN A MONGO ---
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ Error al conectar a MongoDB:', err);
    process.exit(1);
  });

// --- 5. AUTH/USUARIOS ---
app.post('/api/register', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'El nombre de usuario ya existe.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, username, password: hashedPassword });
    const savedUser = await newUser.save();
    res.status(201).json({ message: 'Usuario creado exitosamente', userId: savedUser._id });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Usuario o contraseña incorrectos.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Usuario o contraseña incorrectos.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
});

app.get('/api/user/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('name username foraneo');
  if (!user) return res.status(404).json({ message: 'No encontrado' });
  res.json(user);
});

// PATCH usuario (mover antes de listen)
app.patch('/api/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['name', 'username', 'foraneo'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar usuario' });
  }
});

// --- 6. VIÁTICOS ---
app.use('/api/viaticos', viaticosRoutes);

// --- 7. INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
