// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes'; // Importamos la tubería de rutas
import contactRoutes from './routes/contact.routes';

dotenv.config();
    
const app = express();
const PORT = process.env.PORT || 4000;

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN DE RUTAS ---
// Esto conecta todas las rutas internas de auth.routes.ts 
// bajo el prefijo global /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
// --- RUTA DE SALUD (Health Check) ---
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Servidor operativo y en línea 🚀' });
});

// --- ARRANCAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});