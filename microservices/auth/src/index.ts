import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Simulación de base de datos de usuarios
interface User {
  id: string;
  email: string;
  password: string;
  nombre: string;
  tipo: 'conductor' | 'peaton' | 'pasajero';
  createdAt: Date;
}

const users: User[] = [];

// Middleware de autenticación
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    (req as any).user = user;
    next();
  });
};

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', service: 'Auth Service' });
});

// Registro de usuario
app.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, nombre, tipo } = req.body;

    // Validaciones
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, password y nombre son requeridos' });
    }

    // Verificar si el usuario ya existe
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser: User = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      nombre,
      tipo: tipo || 'conductor',
      createdAt: new Date()
    };

    users.push(newUser);

    // Generar token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, tipo: newUser.tipo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        nombre: newUser.nombre,
        tipo: newUser.tipo
      },
      token
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Login
app.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    // Buscar usuario
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        tipo: user.tipo
      },
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al hacer login' });
  }
});

// Verificar token
app.post('/verify', authenticateToken, (req: Request, res: Response) => {
  res.json({
    valid: true,
    user: (req as any).user
  });
});

// Obtener perfil de usuario
app.get('/profile', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      tipo: user.tipo,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Logout (en un sistema real, se invalidaría el token en una lista negra)
app.post('/logout', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: 'Logout exitoso' });
});

app.listen(PORT, () => {
  console.log(`🔐 Auth Service corriendo en puerto ${PORT}`);
});

export { authenticateToken };
