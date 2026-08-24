import {
  NextFunction,
  Request,
  Response,
} from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { RolUsuario } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { esRolConPerfilProfesional } from "../utils/rol-profesional";

interface PayloadTokenAcceso extends JwtPayload {
  usuarioId?: string;

  // Compatibilidad con tokens creados antes de la migración.
  userId?: string;
}

function obtenerSecretoJwt(): string {
  const secreto = process.env.JWT_SECRET;

  if (!secreto) {
    throw new Error(
      "JWT_SECRET no está configurado."
    );
  }

  return secreto;
}

export const autenticar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const autorizacion =
      req.headers.authorization;

    if (
      !autorizacion ||
      !autorizacion.startsWith("Bearer ")
    ) {
      res.status(401).json({
        error:
          "Token de autenticación no proporcionado.",
      });
      return;
    }

    const token = autorizacion
      .slice("Bearer ".length)
      .trim();

    if (!token) {
      res.status(401).json({
        error: "Token inválido.",
      });
      return;
    }

    const decodificado = jwt.verify(
      token,
      obtenerSecretoJwt()
    ) as PayloadTokenAcceso;

    const usuarioId =
      decodificado.usuarioId ??
      decodificado.userId;

    if (!usuarioId) {
      res.status(401).json({
        error:
          "El token no contiene un usuario válido.",
      });
      return;
    }

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          id: usuarioId,
        },
        include: {
          profesional: {
            select: {
              id: true,
              activo: true,
            },
          },
          empresa: {
            select: {
              id: true,
              activo: true,
            },
          },
        },
      });

    if (!usuario) {
      res.status(401).json({
        error:
          "El usuario asociado al token no existe.",
      });
      return;
    }

    if (!usuario.activo) {
      res.status(403).json({
        error: "Tu cuenta está inactiva.",
      });
      return;
    }

    const esUsuarioCliente =
      usuario.rol ===
        RolUsuario.ADMIN_CLIENTE ||
      usuario.rol ===
        RolUsuario.USUARIO_CLIENTE;

    if (
      esUsuarioCliente &&
      !usuario.empresa
    ) {
      res.status(403).json({
        error:
          "Tu usuario no tiene una empresa asignada.",
      });
      return;
    }

    if (
      esUsuarioCliente &&
      usuario.empresa &&
      !usuario.empresa.activo
    ) {
      res.status(403).json({
        error:
          "La empresa asociada a tu cuenta está inactiva.",
      });
      return;
    }

    if (
      esRolConPerfilProfesional(
        usuario.rol
      ) &&
      !usuario.profesional
    ) {
      res.status(403).json({
        error:
          "Tu usuario no está vinculado con un perfil profesional.",
      });
      return;
    }

    if (
      esRolConPerfilProfesional(
        usuario.rol
      ) &&
      usuario.profesional &&
      !usuario.profesional.activo
    ) {
      res.status(403).json({
        error:
          "El perfil profesional está inactivo.",
      });
      return;
    }

    const profesionalId =
      usuario.profesional?.id ?? null;

    req.user = {
      // Campos canónicos en español.
      usuarioId: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      empresaId: usuario.empresaId,
      profesionalId,

      // Compatibilidad temporal.
      userId: usuario.id,
      email: usuario.correo,
      role: usuario.rol,
      companyId: usuario.empresaId,
      professionalId: profesionalId,
    };

    next();
  } catch (error) {
    console.error(
      "[MIDDLEWARE-AUTENTICACION]",
      error
    );

    if (
      error instanceof Error &&
      error.message ===
        "JWT_SECRET no está configurado."
    ) {
      res.status(500).json({
        error:
          "La autenticación no está configurada correctamente.",
      });
      return;
    }

    res.status(401).json({
      error: "Token inválido o vencido.",
    });
  }
};

export const autorizar = (
  ...rolesPermitidos: RolUsuario[]
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        error: "No autenticado.",
      });
      return;
    }

    if (
      !rolesPermitidos.includes(
        req.user.rol
      )
    ) {
      res.status(403).json({
        error:
          "No tienes permisos para realizar esta acción.",
      });
      return;
    }

    next();
  };
};

// ======================================================
// ALIASES TEMPORALES PARA LAS RUTAS EXISTENTES
// ======================================================

export const authenticate = autenticar;
export const authorize = autorizar;
