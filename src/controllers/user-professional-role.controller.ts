import { Request, Response } from "express";
import {
  Prisma,
  RolUsuario,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";
import {
  puedeAsignarRol,
} from "../utils/access";
import {
  esRolConPerfilProfesional,
} from "../utils/rol-profesional";
import {
  controladorUsuario,
} from "./user.controller";

function normalizarTexto(
  valor: unknown
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function normalizarCorreo(
  valor: unknown
): string {
  return normalizarTexto(valor).toLowerCase();
}

function obtenerCampo(
  body: Record<string, unknown>,
  nombreEspanol: string,
  nombreAnterior: string
): unknown {
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      nombreEspanol
    )
  ) {
    return body[nombreEspanol];
  }

  return body[nombreAnterior];
}

function tieneCampo(
  body: Record<string, unknown>,
  nombreEspanol: string,
  nombreAnterior: string
): boolean {
  return (
    Object.prototype.hasOwnProperty.call(
      body,
      nombreEspanol
    ) ||
    Object.prototype.hasOwnProperty.call(
      body,
      nombreAnterior
    )
  );
}

function convertirRol(
  valor: unknown
): RolUsuario | null {
  if (
    Object.values(RolUsuario).includes(
      valor as RolUsuario
    )
  ) {
    return valor as RolUsuario;
  }

  const equivalencias: Record<
    string,
    RolUsuario
  > = {
    USER: RolUsuario.USUARIO,
    CLIENT_USER:
      RolUsuario.USUARIO_CLIENTE,
    CLIENT_ADMIN:
      RolUsuario.ADMIN_CLIENTE,
    PROFESSIONAL:
      RolUsuario.PROFESIONAL,
    COORDINATOR:
      RolUsuario.COORDINADOR,
    ADMIN: RolUsuario.ADMIN,
    OWNER: RolUsuario.PROPIETARIO,
    SUPERADMIN:
      RolUsuario.SUPERADMIN,
  };

  return typeof valor === "string"
    ? equivalencias[valor] ?? null
    : null;
}

function rolAnterior(
  rol: RolUsuario
): string {
  const equivalencias: Record<
    RolUsuario,
    string
  > = {
    [RolUsuario.USUARIO]: "USER",
    [RolUsuario.USUARIO_CLIENTE]:
      "CLIENT_USER",
    [RolUsuario.ADMIN_CLIENTE]:
      "CLIENT_ADMIN",
    [RolUsuario.PROFESIONAL]:
      "PROFESSIONAL",
    [RolUsuario.COORDINADOR]:
      "COORDINATOR",
    [RolUsuario.ADMIN]: "ADMIN",
    [RolUsuario.PROPIETARIO]:
      "OWNER",
    [RolUsuario.SUPERADMIN]:
      "SUPERADMIN",
  };

  return equivalencias[rol];
}

const seleccionUsuario = {
  id: true,
  nombre: true,
  correo: true,
  rol: true,
  empresaId: true,
  activo: true,
  creadoEn: true,
  actualizadoEn: true,
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
} satisfies Prisma.UsuarioSelect;

type UsuarioSeleccionado =
  Prisma.UsuarioGetPayload<{
    select: typeof seleccionUsuario;
  }>;

function serializarUsuario(
  usuario: UsuarioSeleccionado
) {
  const empresa = usuario.empresa
    ? {
        ...usuario.empresa,
        name: usuario.empresa.nombre,
        taxId: usuario.empresa.nit,
        isActive: usuario.empresa.activo,
      }
    : null;

  const profesional = usuario.profesional
    ? {
        ...usuario.profesional,
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
    ...usuario,
    profesionalId:
      usuario.profesional?.id ?? null,
    empresa,
    profesional,
    name: usuario.nombre,
    email: usuario.correo,
    role: rolAnterior(usuario.rol),
    companyId: usuario.empresaId,
    professionalId:
      usuario.profesional?.id ?? null,
    isActive: usuario.activo,
    createdAt: usuario.creadoEn,
    updatedAt: usuario.actualizadoEn,
    company: empresa,
    professional: profesional,
  };
}

async function validarPerfilProfesional(
  profesionalId: string,
  usuarioActualId?: string
): Promise<string | null> {
  const profesional =
    await prisma.profesional.findUnique({
      where: {
        id: profesionalId,
      },
      select: {
        activo: true,
        usuarioId: true,
      },
    });

  if (!profesional || !profesional.activo) {
    return "El perfil profesional no existe o está inactivo.";
  }

  if (
    profesional.usuarioId &&
    profesional.usuarioId !== usuarioActualId
  ) {
    return "El profesional ya está relacionado con otro usuario.";
  }

  return null;
}

async function responderUsuario(
  usuarioId: string,
  res: Response
): Promise<void> {
  const usuario =
    await prisma.usuario.findUniqueOrThrow({
      where: {
        id: usuarioId,
      },
      select: seleccionUsuario,
    });

  res.json(serializarUsuario(usuario));
}

async function crearConPerfilProfesional(
  req: Request,
  res: Response,
  rol: RolUsuario
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: "No autorizado.",
    });
    return;
  }

  if (
    !puedeAsignarRol(
      req.user.rol,
      rol
    )
  ) {
    res.status(403).json({
      error:
        "No tienes permiso para asignar ese rol.",
    });
    return;
  }

  const nombre = normalizarTexto(
    obtenerCampo(
      req.body,
      "nombre",
      "name"
    )
  );
  const correo = normalizarCorreo(
    obtenerCampo(
      req.body,
      "correo",
      "email"
    )
  );
  const contrasena = String(
    obtenerCampo(
      req.body,
      "contrasena",
      "password"
    ) ?? ""
  );
  const profesionalId = normalizarTexto(
    obtenerCampo(
      req.body,
      "profesionalId",
      "professionalId"
    )
  );

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

  if (!profesionalId) {
    res.status(400).json({
      error:
        "Debes seleccionar un perfil profesional.",
    });
    return;
  }

  const errorPerfil =
    await validarPerfilProfesional(
      profesionalId
    );

  if (errorPerfil) {
    res.status(400).json({
      error: errorPerfil,
    });
    return;
  }

  const contrasenaEncriptada =
    await bcrypt.hash(contrasena, 10);

  const usuario = await prisma.$transaction(
    async (tx) => {
      const creado = await tx.usuario.create({
        data: {
          nombre,
          correo,
          contrasena:
            contrasenaEncriptada,
          rol,
          empresaId: null,
          activo:
            typeof obtenerCampo(
              req.body,
              "activo",
              "isActive"
            ) === "boolean"
              ? Boolean(
                  obtenerCampo(
                    req.body,
                    "activo",
                    "isActive"
                  )
                )
              : true,
        },
      });

      await tx.profesional.update({
        where: {
          id: profesionalId,
        },
        data: {
          usuarioId: creado.id,
        },
      });

      return creado;
    }
  );

  res.status(201);
  await responderUsuario(
    usuario.id,
    res
  );
}

async function actualizarRolProfesional(
  req: Request,
  res: Response,
  objetivo: {
    id: string;
    nombre: string;
    correo: string;
    rol: RolUsuario;
    activo: boolean;
    profesional: {
      id: string;
    } | null;
  },
  rolFinal: RolUsuario
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      error: "No autorizado.",
    });
    return;
  }

  if (
    !puedeAsignarRol(
      req.user.rol,
      rolFinal
    )
  ) {
    res.status(403).json({
      error:
        "No tienes permiso para asignar ese rol.",
    });
    return;
  }

  const nombre = tieneCampo(
    req.body,
    "nombre",
    "name"
  )
    ? normalizarTexto(
        obtenerCampo(
          req.body,
          "nombre",
          "name"
        )
      )
    : objetivo.nombre;
  const correo = tieneCampo(
    req.body,
    "correo",
    "email"
  )
    ? normalizarCorreo(
        obtenerCampo(
          req.body,
          "correo",
          "email"
        )
      )
    : objetivo.correo;
  const profesionalId = tieneCampo(
    req.body,
    "profesionalId",
    "professionalId"
  )
    ? normalizarTexto(
        obtenerCampo(
          req.body,
          "profesionalId",
          "professionalId"
        )
      )
    : objetivo.profesional?.id ?? "";

  if (!nombre || !correo) {
    res.status(400).json({
      error:
        "Nombre y correo son obligatorios.",
    });
    return;
  }

  if (!profesionalId) {
    res.status(400).json({
      error:
        "Debes seleccionar un perfil profesional.",
    });
    return;
  }

  const errorPerfil =
    await validarPerfilProfesional(
      profesionalId,
      objetivo.id
    );

  if (errorPerfil) {
    res.status(400).json({
      error: errorPerfil,
    });
    return;
  }

  const valorContrasena = obtenerCampo(
    req.body,
    "contrasena",
    "password"
  );
  const contrasena =
    typeof valorContrasena === "string"
      ? valorContrasena
      : "";

  if (
    contrasena &&
    contrasena.length < 8
  ) {
    res.status(400).json({
      error:
        "La contraseña debe tener mínimo 8 caracteres.",
    });
    return;
  }

  const contrasenaEncriptada = contrasena
    ? await bcrypt.hash(contrasena, 10)
    : null;

  await prisma.$transaction(async (tx) => {
    if (
      objetivo.profesional &&
      objetivo.profesional.id !==
        profesionalId
    ) {
      await tx.profesional.update({
        where: {
          id: objetivo.profesional.id,
        },
        data: {
          usuarioId: null,
        },
      });
    }

    await tx.usuario.update({
      where: {
        id: objetivo.id,
      },
      data: {
        nombre,
        correo,
        rol: rolFinal,
        empresaId: null,
        activo:
          typeof obtenerCampo(
            req.body,
            "activo",
            "isActive"
          ) === "boolean"
            ? Boolean(
                obtenerCampo(
                  req.body,
                  "activo",
                  "isActive"
                )
              )
            : objetivo.activo,
        ...(contrasenaEncriptada
          ? {
              contrasena:
                contrasenaEncriptada,
            }
          : {}),
      },
    });

    await tx.profesional.update({
      where: {
        id: profesionalId,
      },
      data: {
        usuarioId: objetivo.id,
      },
    });
  });

  await responderUsuario(
    objetivo.id,
    res
  );
}

function manejarError(
  error: unknown,
  res: Response,
  contexto: string
): void {
  console.error(contexto, error);

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    res.status(409).json({
      error:
        "Ya existe un registro con alguno de los datos únicos suministrados.",
    });
    return;
  }

  res.status(500).json({
    error:
      "No fue posible guardar el usuario.",
  });
}

export const controladorUsuarioRolesProfesionales = {
  obtenerTodos:
    controladorUsuario.obtenerTodos,
  obtenerPorId:
    controladorUsuario.obtenerPorId,

  crear: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const rol = convertirRol(
      obtenerCampo(
        req.body,
        "rol",
        "role"
      )
    );

    if (
      rol !== RolUsuario.COORDINADOR
    ) {
      await controladorUsuario.crear(
        req,
        res
      );
      return;
    }

    try {
      await crearConPerfilProfesional(
        req,
        res,
        rol
      );
    } catch (error) {
      manejarError(
        error,
        res,
        "[USUARIO-CREAR-COORDINADOR]"
      );
    }
  },

  actualizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const objetivo =
        await prisma.usuario.findUnique({
          where: {
            id: String(req.params.id),
          },
          select: {
            id: true,
            nombre: true,
            correo: true,
            rol: true,
            activo: true,
            profesional: {
              select: {
                id: true,
              },
            },
          },
        });

      if (!objetivo) {
        res.status(404).json({
          error:
            "Usuario no encontrado.",
        });
        return;
      }

      const rolSolicitado = tieneCampo(
        req.body,
        "rol",
        "role"
      )
        ? convertirRol(
            obtenerCampo(
              req.body,
              "rol",
              "role"
            )
          )
        : objetivo.rol;

      if (!rolSolicitado) {
        res.status(400).json({
          error: "Rol no válido.",
        });
        return;
      }

      const requiereFlujoEspecial =
        rolSolicitado ===
          RolUsuario.COORDINADOR ||
        (
          objetivo.rol ===
            RolUsuario.COORDINADOR &&
          esRolConPerfilProfesional(
            rolSolicitado
          )
        );

      if (!requiereFlujoEspecial) {
        await controladorUsuario.actualizar(
          req,
          res
        );
        return;
      }

      await actualizarRolProfesional(
        req,
        res,
        objetivo,
        rolSolicitado
      );
    } catch (error) {
      manejarError(
        error,
        res,
        "[USUARIO-ACTUALIZAR-COORDINADOR]"
      );
    }
  },

  eliminar:
    controladorUsuario.eliminar,
};
