import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
dotenv.config();

import express from 'express';
import multer from 'multer';
import { createReadStream, unlinkSync } from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import mongoose from 'mongoose';
import cors from 'cors';

import Carta from './models/Carta.js';  

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MONGO_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

// Check for required environment variables
if (!TELEGRAM_TOKEN || !CHAT_ID || !MONGO_URI) {
  console.error('❌ Faltan variables de entorno obligatorias: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, MONGO_URI');
  process.exit(1);
}
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

// Middleware to handle JSON and file uploads with multer
app.use((req, res, next) => {
  if (req.path === '/mensaje') {
    next(); 
  } else {
    express.json()(req, res, next);
  }
});




// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const allowedOrigins = [
  'https://komi-page.vercel.app',
  'http://localhost:3000'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});



io.on('connection', (socket) => {
  console.log('Cliente conectado', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado', socket.id);
  });
});

const socket = io('https://api-eru.onrender.com', {
  transports: ['websocket']
});


// Routes

app.post('/mensaje', upload.single('imagen'), async (req, res) => {
  try {
    const { titulo, texto } = req.body;

    if (!texto || texto.trim() === '') {
      return res.status(400).json({ error: 'El texto es obligatorio' });
    }

    const mensajeTelegram = `📨 *${titulo || 'Sin título'}*\n🗓️ ${new Date().toLocaleDateString()}\n\n${texto}`;

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: mensajeTelegram,
      parse_mode: 'Markdown',
    });

    if (req.file) {
      const form = new FormData();
      form.append('chat_id', CHAT_ID);
      form.append('photo', createReadStream(req.file.path));

      await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, form, {
        headers: form.getHeaders(),
      });

      unlinkSync(req.file.path);
    }

    res.json({ success: true, message: 'Mensaje enviado.' });
  } catch (error) {
    if (req.file) unlinkSync(req.file.path);

    console.error('❌ Error en /mensaje:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error al procesar el mensaje.' });
  }
});

/// add letter
app.post('/cartas', async (req, res) => {
  try {
    const { texto } = req.body;

    if (!texto || texto.trim() === '') {
      return res.status(400).json({ error: 'El texto es obligatorio' });
    }

    const nuevaCarta = new Carta({ texto });
    await nuevaCarta.save();
    
    // event to notify clients about the new carta with Socket.IO
    io.emit('nuevaCarta', nuevaCarta); 

    res.json({ success: true, message: 'Carta agregada correctamente' });
  } catch (error) {
    console.error('Error al agregar carta:', error.message);
    res.status(500).json({ error: 'Error al guardar la carta' });
  }
});



app.get('/cartas', async (req, res) => {
  try {
    const cartas = await Carta.find().sort({ fecha: -1 });
    res.json(cartas);
  } catch (error) {
    console.error('❌ Error en /cartas:', error.message);
    res.status(500).json({ error: 'Error al obtener las cartas.' });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
