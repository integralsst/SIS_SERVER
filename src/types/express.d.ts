import type { RolUsuario } from "@prisma/client";

declare global {
  namespace Express {
    /**
     * Contexto del usuario autenticado.
     *
     * Los campos en español son los canónicos.
     * Los aliases en inglés se conservan temporalmente para permitir
     * la migración gradual de los controladores existentes.
     */
    interface UsuarioAutenticado {
      usuarioId: string;
      correo: string;
      rol: RolUsuario;
      empresaId: string | null;
      profesionalId: string | null;

      // Compatibilidad temporal con el código anterior.
      userId: string;
      email: string;
      role: RolUsuario;
      companyId: string | null;
      professionalId: string | null;
    }

    /**
     * Alias temporal para controladores anteriores que usan:
     * Express.AuthenticatedUser
     */
    interface AuthenticatedUser
      extends UsuarioAutenticado {}

    interface Request {
      user?: UsuarioAutenticado;
    }
  }
}

export {};