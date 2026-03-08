import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. EXTENSIÓN GLOBAL DE EXPRESS
// Esto le dice a TypeScript en todo el proyecto que req.user existe.
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string | number;
        email?: string;
        role?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_para_firmar_tokens_sis_2026';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Acceso denegado. No hay token.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      userId: string | number; 
      email: string; 
      role: string 
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token no válido.' });
  }
};