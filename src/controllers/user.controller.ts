import { Request, Response } from "express";
import {
  Prisma,
  RolUsuario,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma";
import {
  esRolCliente,
  esRolInterno,
  puedeAsignarRol,
  puedeGestionarRolObjetivo,
} from "../utils/access";

const seleccionUsuarioPublico = {
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

function normalizarCorreo(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function normalizarTexto(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
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

function convertirRol(
  value: unknown
): RolUsuario | null {
  if (
    Object.values(RolUsuario).includes(
      value as RolUsuario
    )
  ) {
    return value as RolUsuario;
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
    ADMIN: RolUsuario.ADMIN,
    OWNER: RolUsuario.PROPIETARIO,
    SUPERADMIN:
      RolUsuario.SUPERADMIN,
  };

  return typeof value === "string"
    ? equivalencias[value] ?? null
    : null;
}

function serializarEmpresa(
  empresa:
    | {
        id: string;
        nombre: string;
        nit: string;
        activo: boolean;
      }
    | null
) {
  if (!empresa) {
    return null;
  }

  return {
    ...empresa,
    name: empresa.nombre,
    taxId: empresa.nit,
    isActive: empresa.activo,
  };
}

function serializarProfesional(
  profesional:
    | {
        id: string;
        nombres: string;
        apellidos: string;
        numeroIdentificacion: string;
        profesion: string | null;
        rolProfesional: string | null;
        activo: boolean;
      }
    | null
) {
  if (!profesional) {
    return null;
  }

  return {
    ...profesional,
    firstNames: profesional.nombres,
    lastNames: profesional.apellidos,
    identificationNumber:
      profesional.numeroIdentificacion,
    profession: profesional.profesion,
    professionalRole:
      profesional.rolProfesional,
    isActive: profesional.activo,
  };
}

function serializarUsuario(
  usuario: Prisma.UsuarioGetPayload<{
    select: typeof seleccionUsuarioPublico;
  }>
) {
  const profesionalId =
    usuario.profesional?.id ?? null;

  const empresa =
    serializarEmpresa(usuario.empresa);

  const profesional =
    serializarProfesional(
      usuario.profesional
    );

  return {
    ...usuario,

    // Campos nuevos en español.
    profesionalId,
    empresa,
    profesional,

    // Alias temporales para el frontend anterior.
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
    company: empresa,
    professional: profesional,
  };
}

async function validarEmpresa(
  empresaId: string
): Promise<boolean> {
  const empresa =
    await prisma.empresa.findFirst({
      where: {
        id: empresaId,
        activo: true,
      },
      select: {
        id: true,
      },
    });

  return Boolean(empresa);
}

async function validarProfesional(
  profesionalId: string,
  usuarioActualId?: string
): Promise<{
  valido: boolean;
  error?: string;
}> {
  const profesional =
    await prisma.profesional.findUnique({
      where: {
        id: profesionalId,
      },
      select: {
        id: true,
        activo: true,
        usuarioId: true,
      },
    });

  if (
    !profesional ||
    !profesional.activo
  ) {
    return {
      valido: false,
      error:
        "El perfil profesional no existe o está inactivo.",
    };
  }

  if (
    profesional.usuarioId &&
    profesional.usuarioId !==
      usuarioActualId
  ) {
    return {
      valido: false,
      error:
        "El profesional ya está relacionado con otro usuario.",
    };
  }

  return {
    valido: true,
  };
}

function puedeGestionarUsuario(
  actor: Express.UsuarioAutenticado,
  objetivo: {
    id: string;
    rol: RolUsuario;
    empresaId: string | null;
  }
): boolean {
  if (actor.usuarioId === objetivo.id) {
    return true;
  }

  if (
    actor.rol ===
    RolUsuario.ADMIN_CLIENTE
  ) {
    return (
      objetivo.empresaId ===
        actor.empresaId &&
      objetivo.rol ===
        RolUsuario.USUARIO_CLIENTE
    );
  }

  return (
    esRolInterno(actor.rol) &&
    puedeGestionarRolObjetivo(
      actor.rol,
      objetivo.rol
    )
  );
}

export const controladorUsuario = {
  obtenerTodos: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const busqueda = normalizarTexto(
        req.query.busqueda ??
          req.query.search
      );

      const incluirInactivos =
        req.query.incluirInactivos ===
          "true" ||
        req.query.includeInactive ===
          "true";

      const where: Prisma.UsuarioWhereInput =
        {};

      if (
        req.user.rol ===
        RolUsuario.ADMIN_CLIENTE
      ) {
        where.empresaId =
          req.user.empresaId;
      } else if (
        !esRolInterno(req.user.rol)
      ) {
        where.id = req.user.usuarioId;
      }

      if (!incluirInactivos) {
        where.activo = true;
      }

      if (busqueda) {
        where.OR = [
          {
            nombre: {
              contains: busqueda,
            },
          },
          {
            correo: {
              contains: busqueda,
            },
          },
        ];
      }

      const usuarios =
        await prisma.usuario.findMany({
          where,
          select:
            seleccionUsuarioPublico,
          orderBy: {
            creadoEn: "desc",
          },
        });

      res.json(
        usuarios.map(serializarUsuario)
      );
    } catch (error) {
      console.error(
        "[USUARIO-OBTENER-TODOS]",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener usuarios.",
      });
    }
  },

  obtenerPorId: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const id = String(req.params.id);

      const objetivo =
        await prisma.usuario.findUnique({
          where: {
            id,
          },
          select:
            seleccionUsuarioPublico,
        });

      if (!objetivo) {
        res.status(404).json({
          error:
            "Usuario no encontrado.",
        });
        return;
      }

      if (
        !puedeGestionarUsuario(
          req.user,
          objetivo
        )
      ) {
        res.status(403).json({
          error:
            "No tienes acceso a este usuario.",
        });
        return;
      }

      res.json(
        serializarUsuario(objetivo)
      );
    } catch (error) {
      console.error(
        "[USUARIO-OBTENER-POR-ID]",
        error
      );

      res.status(500).json({
        error:
          "Error al consultar el usuario.",
      });
    }
  },

  crear: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
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

      const valueContrasena =
        obtenerCampo(
          req.body,
          "contrasena",
          "password"
        );

      const contrasena =
        typeof valueContrasena === "string"
          ? valueContrasena
          : "";

      let rol =
        convertirRol(
          obtenerCampo(
            req.body,
            "rol",
            "role"
          )
        ) ?? RolUsuario.USUARIO;

      let empresaId =
        normalizarTexto(
          obtenerCampo(
            req.body,
            "empresaId",
            "companyId"
          )
        ) || null;

      const profesionalId =
        normalizarTexto(
          obtenerCampo(
            req.body,
            "profesionalId",
            "professionalId"
          )
        ) || null;

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

      if (
        req.user.rol ===
        RolUsuario.ADMIN_CLIENTE
      ) {
        rol =
          RolUsuario.USUARIO_CLIENTE;
        empresaId = req.user.empresaId;
      } else if (
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

      if (esRolCliente(rol)) {
        if (!empresaId) {
          res.status(400).json({
            error:
              "Los usuarios cliente deben pertenecer a una empresa.",
          });
          return;
        }

        if (
          !(await validarEmpresa(
            empresaId
          ))
        ) {
          res.status(400).json({
            error:
              "La empresa seleccionada no existe o está inactiva.",
          });
          return;
        }
      }

      if (
        rol === RolUsuario.PROFESIONAL
      ) {
        empresaId = null;

        if (!profesionalId) {
          res.status(400).json({
            error:
              "Debes seleccionar un perfil profesional.",
          });
          return;
        }

        const validacion =
          await validarProfesional(
            profesionalId
          );

        if (!validacion.valido) {
          res.status(400).json({
            error: validacion.error,
          });
          return;
        }
      } else if (
        empresaId &&
        !(await validarEmpresa(empresaId))
      ) {
        res.status(400).json({
          error:
            "La empresa seleccionada no existe o está inactiva.",
        });
        return;
      }

      const contrasenaEncriptada =
        await bcrypt.hash(
          contrasena,
          10
        );

      const usuarioCreado =
        await prisma.$transaction(
          async (tx) => {
            const usuario =
              await tx.usuario.create({
                data: {
                  nombre,
                  correo,
                  contrasena:
                    contrasenaEncriptada,
                  rol,
                  empresaId,
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

            if (
              rol ===
                RolUsuario.PROFESIONAL &&
              profesionalId
            ) {
              await tx.profesional.update({
                where: {
                  id: profesionalId,
                },
                data: {
                  usuarioId: usuario.id,
                },
              });
            }

            return tx.usuario.findUniqueOrThrow(
              {
                where: {
                  id: usuario.id,
                },
                select:
                  seleccionUsuarioPublico,
              }
            );
          }
        );

      res
        .status(201)
        .json(
          serializarUsuario(
            usuarioCreado
          )
        );
    } catch (error) {
      console.error(
        "[USUARIO-CREAR]",
        error
      );

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error:
            "El correo ya está en uso o el profesional ya tiene un usuario.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al crear usuario.",
      });
    }
  },

  actualizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const id = String(req.params.id);

      const objetivo =
        await prisma.usuario.findUnique({
          where: {
            id,
          },
          include: {
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

      if (
        !puedeGestionarUsuario(
          req.user,
          objetivo
        )
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para editar este usuario.",
        });
        return;
      }

      const esPropio =
        req.user.usuarioId ===
        objetivo.id;

      const rolSolicitado =
        obtenerCampo(
          req.body,
          "rol",
          "role"
        );

      const rolFinal =
        convertirRol(rolSolicitado) ??
        objetivo.rol;

      const empresaIdSolicitada =
        obtenerCampo(
          req.body,
          "empresaId",
          "companyId"
        );

      let empresaIdFinal =
        empresaIdSolicitada !== undefined
          ? normalizarTexto(
              empresaIdSolicitada
            ) || null
          : objetivo.empresaId;

      const profesionalIdSolicitado =
        obtenerCampo(
          req.body,
          "profesionalId",
          "professionalId"
        );

      const profesionalIdFinal =
        profesionalIdSolicitado !==
        undefined
          ? normalizarTexto(
              profesionalIdSolicitado
            ) || null
          : objetivo.profesional?.id ??
            null;

      const activoSolicitado =
        obtenerCampo(
          req.body,
          "activo",
          "isActive"
        );

      if (!esPropio) {
        if (
          req.user.rol ===
            RolUsuario.ADMIN_CLIENTE &&
          rolFinal !==
            RolUsuario.USUARIO_CLIENTE
        ) {
          res.status(403).json({
            error:
              "Un administrador cliente solo puede gestionar usuarios cliente.",
          });
          return;
        }

        if (
          req.user.rol !==
            RolUsuario.ADMIN_CLIENTE &&
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
      }

      if (
        esPropio &&
        (rolSolicitado !== undefined ||
          empresaIdSolicitada !==
            undefined ||
          activoSolicitado !==
            undefined ||
          profesionalIdSolicitado !==
            undefined)
      ) {
        res.status(403).json({
          error:
            "No puedes cambiar tu propio rol, empresa, estado o perfil profesional.",
        });
        return;
      }

      if (
        req.user.rol ===
        RolUsuario.ADMIN_CLIENTE
      ) {
        empresaIdFinal =
          req.user.empresaId;
      }

      if (esRolCliente(rolFinal)) {
        if (!empresaIdFinal) {
          res.status(400).json({
            error:
              "Los usuarios cliente deben pertenecer a una empresa.",
          });
          return;
        }

        if (
          !(await validarEmpresa(
            empresaIdFinal
          ))
        ) {
          res.status(400).json({
            error:
              "La empresa seleccionada no existe o está inactiva.",
          });
          return;
        }
      }

      if (
        rolFinal ===
        RolUsuario.PROFESIONAL
      ) {
        empresaIdFinal = null;

        if (!profesionalIdFinal) {
          res.status(400).json({
            error:
              "Debes seleccionar un perfil profesional.",
          });
          return;
        }

        const validacion =
          await validarProfesional(
            profesionalIdFinal,
            objetivo.id
          );

        if (!validacion.valido) {
          res.status(400).json({
            error: validacion.error,
          });
          return;
        }
      } else if (
        empresaIdFinal &&
        !(await validarEmpresa(
          empresaIdFinal
        ))
      ) {
        res.status(400).json({
          error:
            "La empresa seleccionada no existe o está inactiva.",
        });
        return;
      }

      const data:
        Prisma.UsuarioUncheckedUpdateInput =
          {};

      const nombreSolicitado =
        obtenerCampo(
          req.body,
          "nombre",
          "name"
        );

      if (nombreSolicitado !== undefined) {
        const nombre =
          normalizarTexto(
            nombreSolicitado
          );

        if (!nombre) {
          res.status(400).json({
            error:
              "El nombre no puede estar vacío.",
          });
          return;
        }

        data.nombre = nombre;
      }

      const correoSolicitado =
        obtenerCampo(
          req.body,
          "correo",
          "email"
        );

      if (correoSolicitado !== undefined) {
        const correo =
          normalizarCorreo(
            correoSolicitado
          );

        if (!correo) {
          res.status(400).json({
            error:
              "El correo no puede estar vacío.",
          });
          return;
        }

        data.correo = correo;
      }

      const contrasenaSolicitada =
        obtenerCampo(
          req.body,
          "contrasena",
          "password"
        );

      if (
        typeof contrasenaSolicitada ===
          "string" &&
        contrasenaSolicitada.trim()
      ) {
        if (
          contrasenaSolicitada.length < 8
        ) {
          res.status(400).json({
            error:
              "La contraseña debe tener mínimo 8 caracteres.",
          });
          return;
        }

        data.contrasena =
          await bcrypt.hash(
            contrasenaSolicitada,
            10
          );
      }

      if (!esPropio) {
        data.rol = rolFinal;
        data.empresaId =
          empresaIdFinal;

        if (
          typeof activoSolicitado ===
          "boolean"
        ) {
          data.activo =
            activoSolicitado;
        }
      }

      const usuarioActualizado =
        await prisma.$transaction(
          async (tx) => {
            if (
              objetivo.profesional &&
              (rolFinal !==
                RolUsuario.PROFESIONAL ||
                profesionalIdFinal !==
                  objetivo.profesional.id)
            ) {
              await tx.profesional.update({
                where: {
                  id: objetivo.profesional
                    .id,
                },
                data: {
                  usuarioId: null,
                },
              });
            }

            await tx.usuario.update({
              where: {
                id,
              },
              data,
            });

            if (
              rolFinal ===
                RolUsuario.PROFESIONAL &&
              profesionalIdFinal
            ) {
              await tx.profesional.update({
                where: {
                  id: profesionalIdFinal,
                },
                data: {
                  usuarioId: id,
                },
              });
            }

            return tx.usuario.findUniqueOrThrow(
              {
                where: {
                  id,
                },
                select:
                  seleccionUsuarioPublico,
              }
            );
          }
        );

      res.json(
        serializarUsuario(
          usuarioActualizado
        )
      );
    } catch (error) {
      console.error(
        "[USUARIO-ACTUALIZAR]",
        error
      );

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error:
            "El correo ya está en uso o el profesional ya tiene un usuario.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al actualizar usuario.",
      });
    }
  },

  eliminar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autorizado.",
        });
        return;
      }

      const id = String(req.params.id);

      if (id === req.user.usuarioId) {
        res.status(400).json({
          error:
            "No puedes eliminar tu propia cuenta.",
        });
        return;
      }

      const objetivo =
        await prisma.usuario.findUnique({
          where: {
            id,
          },
        });

      if (!objetivo) {
        res.status(404).json({
          error:
            "Usuario no encontrado.",
        });
        return;
      }

      if (
        !puedeGestionarUsuario(
          req.user,
          objetivo
        )
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para eliminar este usuario.",
        });
        return;
      }

      if (
        objetivo.rol ===
        RolUsuario.SUPERADMIN
      ) {
        const cantidadSuperadmin =
          await prisma.usuario.count({
            where: {
              rol:
                RolUsuario.SUPERADMIN,
              activo: true,
            },
          });

        if (
          cantidadSuperadmin <= 1
        ) {
          res.status(400).json({
            error:
              "No puedes eliminar el último SUPERADMIN activo.",
          });
          return;
        }
      }

      await prisma.usuario.delete({
        where: {
          id,
        },
      });

      res.json({
        mensaje:
          "Usuario eliminado correctamente.",
        message:
          "Usuario eliminado correctamente.",
      });
    } catch (error) {
      console.error(
        "[USUARIO-ELIMINAR]",
        error
      );

      res.status(500).json({
        error:
          "Error al eliminar usuario.",
      });
    }
  },
};

// Alias temporal: mantiene funcionando las rutas actuales.
export const userController = {
  getAll:
    controladorUsuario.obtenerTodos,
  getById:
    controladorUsuario.obtenerPorId,
  create: controladorUsuario.crear,
  update:
    controladorUsuario.actualizar,
  delete: controladorUsuario.eliminar,
};
