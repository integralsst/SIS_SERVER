import { Request, Response } from "express";
import {
  Prisma,
  RolUsuario,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma";

// ======================================================
// CONFIGURACIÓN
// ======================================================

function obtenerSecretoJwt(): string {
  const secreto = process.env.JWT_SECRET;

  if (!secreto) {
    throw new Error(
      "JWT_SECRET no está configurado."
    );
  }

  return secreto;
}

function normalizarCorreo(
  valor: unknown
): string {
  return typeof valor === "string"
    ? valor.trim().toLowerCase()
    : "";
}

function normalizarTexto(
  valor: unknown
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

// ======================================================
// COMPATIBILIDAD TEMPORAL CON EL FRONTEND ANTERIOR
// ======================================================

type RolAnterior =
  | "USER"
  | "CLIENT_USER"
  | "CLIENT_ADMIN"
  | "PROFESSIONAL"
  | "ADMIN"
  | "OWNER"
  | "SUPERADMIN";

function convertirRolAnterior(
  rol: RolUsuario
): RolAnterior {
  const equivalencias: Record<
    RolUsuario,
    RolAnterior
  > = {
    [RolUsuario.USUARIO]: "USER",
    [RolUsuario.USUARIO_CLIENTE]:
      "CLIENT_USER",
    [RolUsuario.ADMIN_CLIENTE]:
      "CLIENT_ADMIN",
    [RolUsuario.PROFESIONAL]:
      "PROFESSIONAL",
    [RolUsuario.COORDINADOR]:
      "PROFESSIONAL",
    [RolUsuario.ADMIN]: "ADMIN",
    [RolUsuario.PROPIETARIO]:
      "OWNER",
    [RolUsuario.SUPERADMIN]:
      "SUPERADMIN",
  };

  return equivalencias[rol];
}

const incluirContextoUsuario = {
  empresa: {
    select: {
      id: true,
      nombre: true,
      nit: true,
      activo: true,
    },
  },
  profesional: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      numeroIdentificacion: true,
      profesion: true,
      rolProfesional: true,
      activo: true,
    },
  },
} satisfies Prisma.UsuarioInclude;

type UsuarioConContexto =
  Prisma.UsuarioGetPayload<{
    include: typeof incluirContextoUsuario;
  }>;

function construirUsuarioRespuesta(
  usuario: UsuarioConContexto
) {
  const profesionalId =
    usuario.profesional?.id ?? null;

  const empresaEspanol =
    usuario.empresa
      ? {
          id: usuario.empresa.id,
          nombre: usuario.empresa.nombre,
          nit: usuario.empresa.nit,
          activo: usuario.empresa.activo,
        }
      : null;

  const empresaAnterior =
    usuario.empresa
      ? {
          id: usuario.empresa.id,
          name: usuario.empresa.nombre,
          taxId: usuario.empresa.nit,
          isActive: usuario.empresa.activo,
        }
      : null;

  const profesionalEspanol =
    usuario.profesional
      ? {
          id: usuario.profesional.id,
          nombres:
            usuario.profesional.nombres,
          apellidos:
            usuario.profesional.apellidos,
          numeroIdentificacion:
            usuario.profesional
              .numeroIdentificacion,
          profesion:
            usuario.profesional.profesion,
          rolProfesional:
            usuario.profesional
              .rolProfesional,
          activo:
            usuario.profesional.activo,
        }
      : null;

  const profesionalAnterior =
    usuario.profesional
      ? {
          id: usuario.profesional.id,
          firstNames:
            usuario.profesional.nombres,
          lastNames:
            usuario.profesional.apellidos,
          identificationNumber:
            usuario.profesional
              .numeroIdentificacion,
          profession:
            usuario.profesional.profesion,
          professionalRole:
            usuario.profesional
              .rolProfesional,
          isActive:
            usuario.profesional.activo,
        }
      : null;

  return {
    id: usuario.id,

    // Campos nuevos en español.
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    empresaId: usuario.empresaId,
    profesionalId,
    activo: usuario.activo,
    creadoEn: usuario.creadoEn,
    actualizadoEn:
      usuario.actualizadoEn,
    empresa: empresaEspanol,
    profesional: profesionalEspanol,

    // Campos temporales para no romper el frontend actual.
    name: usuario.nombre,
    email: usuario.correo,
    role: convertirRolAnterior(
      usuario.rol
    ),
    companyId: usuario.empresaId,
    professionalId: profesionalId,
    isActive: usuario.activo,
    createdAt: usuario.creadoEn,
    updatedAt: usuario.actualizadoEn,
    company: empresaAnterior,
    professional:
      profesionalAnterior,
  };
}

// ======================================================
// REGISTRO PÚBLICO
// ======================================================

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Acepta español y, temporalmente, inglés.
    const correo = normalizarCorreo(
      req.body.correo ?? req.body.email
    );

    const nombre = normalizarTexto(
      req.body.nombre ?? req.body.name
    );

    const contrasena =
      typeof (
        req.body.contrasena ??
        req.body.password
      ) === "string"
        ? String(
            req.body.contrasena ??
              req.body.password
          )
        : "";

    if (
      !nombre ||
      !correo ||
      !contrasena
    ) {
      res.status(400).json({
        error:
          "Nombre, correo y contraseña son obligatorios.",
      });
      return;
    }

    if (contrasena.length < 8) {
      res.status(400).json({
        error:
          "La contraseña debe tener mínimo 8 caracteres.",
      });
      return;
    }

    const usuarioExistente =
      await prisma.usuario.findUnique({
        where: {
          correo,
        },
        select: {
          id: true,
        },
      });

    if (usuarioExistente) {
      res.status(409).json({
        error:
          "El correo ya está registrado.",
      });
      return;
    }

    const contrasenaEncriptada =
      await bcrypt.hash(contrasena, 10);

    const usuario =
      await prisma.usuario.create({
        data: {
          nombre,
          correo,
          contrasena:
            contrasenaEncriptada,
          rol: RolUsuario.USUARIO,
          empresaId: null,
          activo: true,
        },
        include:
          incluirContextoUsuario,
      });

    const respuesta =
      construirUsuarioRespuesta(
        usuario
      );

    res.status(201).json({
      mensaje:
        "Usuario creado exitosamente.",
      message:
        "Usuario creado exitosamente.",
      usuario: respuesta,
      user: respuesta,
    });
  } catch (error) {
    console.error(
      "[AUTENTICACION-REGISTRO]",
      error
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error:
          "El correo ya está registrado.",
      });
      return;
    }

    res.status(500).json({
      error:
        "Error interno del servidor al registrar.",
    });
  }
};

// ======================================================
// INICIO DE SESIÓN
// ======================================================

export const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Acepta español y, temporalmente, inglés.
    const correo = normalizarCorreo(
      req.body.correo ?? req.body.email
    );

    const contrasena =
      typeof (
        req.body.contrasena ??
        req.body.password
      ) === "string"
        ? String(
            req.body.contrasena ??
              req.body.password
          )
        : "";

    if (!correo || !contrasena) {
      res.status(400).json({
        error:
          "Correo y contraseña son obligatorios.",
      });
      return;
    }

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          correo,
        },
        include:
          incluirContextoUsuario,
      });

    if (!usuario) {
      res.status(401).json({
        error:
          "Credenciales inválidas.",
      });
      return;
    }

    if (!usuario.activo) {
      res.status(403).json({
        error:
          "Tu cuenta se encuentra inactiva.",
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
      usuario.empresa &&
      !usuario.empresa.activo
    ) {
      res.status(403).json({
        error:
          "La empresa asociada se encuentra inactiva.",
      });
      return;
    }

    if (
      usuario.rol ===
        RolUsuario.PROFESIONAL &&
      !usuario.profesional
    ) {
      res.status(403).json({
        error:
          "Tu usuario no está vinculado con un perfil profesional.",
      });
      return;
    }

    if (
      usuario.profesional &&
      !usuario.profesional.activo
    ) {
      res.status(403).json({
        error:
          "El perfil profesional se encuentra inactivo.",
      });
      return;
    }

    const contrasenaValida =
      await bcrypt.compare(
        contrasena,
        usuario.contrasena
      );

    if (!contrasenaValida) {
      res.status(401).json({
        error:
          "Credenciales inválidas.",
      });
      return;
    }

    const profesionalId =
      usuario.profesional?.id ?? null;

    const token = jwt.sign(
      {
        // Claims canónicos.
        usuarioId: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        profesionalId,

        // Claims temporales.
        userId: usuario.id,
        email: usuario.correo,
        role: convertirRolAnterior(
          usuario.rol
        ),
        companyId: usuario.empresaId,
        professionalId:
          profesionalId,
      },
      obtenerSecretoJwt(),
      {
        expiresIn: "24h",
      }
    );

    const respuesta =
      construirUsuarioRespuesta(
        usuario
      );

    res.json({
      mensaje: "Login exitoso.",
      message: "Login exitoso.",
      token,

      // Respuesta nueva.
      usuario: respuesta,

      // Compatibilidad con LoginPage y AuthContext actuales.
      user: respuesta,
    });
  } catch (error) {
    console.error(
      "[AUTENTICACION-LOGIN]",
      error
    );

    res.status(500).json({
      error:
        "Error interno del servidor al iniciar sesión.",
    });
  }
};

// ======================================================
// USUARIO AUTENTICADO
// ======================================================

export const getMe = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "No autenticado.",
      });
      return;
    }

    const usuario =
      await prisma.usuario.findUnique({
        where: {
          id: req.user.usuarioId,
        },
        include:
          incluirContextoUsuario,
      });

    if (!usuario) {
      res.status(404).json({
        error:
          "Usuario no encontrado.",
      });
      return;
    }

    if (!usuario.activo) {
      res.status(403).json({
        error:
          "La cuenta está inactiva.",
      });
      return;
    }

    /**
     * Se devuelve el objeto directamente porque el AuthContext actual
     * consume GET /api/auth/me esperando al usuario en la raíz.
     *
     * El objeto incluye propiedades en español y aliases temporales
     * en inglés para que el frontend siga funcionando durante la migración.
     */
    res.json(
      construirUsuarioRespuesta(
        usuario
      )
    );
  } catch (error) {
    console.error(
      "[AUTENTICACION-ME]",
      error
    );

    res.status(500).json({
      error:
        "Error al consultar la sesión.",
    });
  }
};
