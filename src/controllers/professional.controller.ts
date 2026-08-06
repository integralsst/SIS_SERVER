import { Request, Response } from "express";
import {
  Prisma,
  RolUsuario,
  TipoIdentificacion,
} from "@prisma/client";

import { prisma } from "../lib/prisma";
import { esRolInterno } from "../utils/access";

class ErrorValidacion extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorValidacion";
  }
}

function normalizarTexto(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function textoOpcional(
  value: unknown
): string | null {
  const valueNormalizado =
    normalizarTexto(value);

  return valueNormalizado || null;
}

function normalizarCorreo(
  value: unknown
): string {
  const correo =
    normalizarTexto(value).toLowerCase();

  if (
    correo &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      correo
    )
  ) {
    throw new ErrorValidacion(
      "El correo electrónico no es válido."
    );
  }

  return correo;
}

function fechaOpcional(
  value: unknown
): Date | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const fecha = new Date(String(value));

  if (Number.isNaN(fecha.getTime())) {
    throw new ErrorValidacion(
      "La fecha no es válida."
    );
  }

  return fecha;
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

function convertirTipoIdentificacion(
  value: unknown
): TipoIdentificacion | null {
  if (
    Object.values(
      TipoIdentificacion
    ).includes(
      value as TipoIdentificacion
    )
  ) {
    return value as TipoIdentificacion;
  }

  if (value === "PASSPORT") {
    return TipoIdentificacion.PASAPORTE;
  }

  if (value === "OTHER") {
    return TipoIdentificacion.OTRO;
  }

  return null;
}

function convertirTipoAnterior(
  value: TipoIdentificacion
): string {
  if (
    value ===
    TipoIdentificacion.PASAPORTE
  ) {
    return "PASSPORT";
  }

  if (
    value === TipoIdentificacion.OTRO
  ) {
    return "OTHER";
  }

  return value;
}

const seleccionProfesional = {
  id: true,
  tipoIdentificacion: true,
  numeroIdentificacion: true,
  nombres: true,
  apellidos: true,
  cargo: true,
  profesion: true,
  rolProfesional: true,
  correo: true,
  celular: true,
  direccion: true,
  activo: true,
  usuarioId: true,
  creadoEn: true,
  actualizadoEn: true,

  usuario: {
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      activo: true,
    },
  },

  asignacionesEmpresas: {
    include: {
      empresa: {
        select: {
          id: true,
          nombre: true,
          nit: true,
          ciudadPrincipal: true,
          activo: true,
        },
      },
    },
  },
} satisfies Prisma.ProfesionalSelect;

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
      "PROFESSIONAL",
    [RolUsuario.ADMIN]: "ADMIN",
    [RolUsuario.PROPIETARIO]:
      "OWNER",
    [RolUsuario.SUPERADMIN]:
      "SUPERADMIN",
  };

  return equivalencias[rol];
}

function serializarUsuario(
  usuario:
    | {
        id: string;
        nombre: string;
        correo: string;
        rol: RolUsuario;
        activo: boolean;
      }
    | null
) {
  if (!usuario) {
    return null;
  }

  return {
    ...usuario,
    name: usuario.nombre,
    email: usuario.correo,
    role: rolAnterior(usuario.rol),
    isActive: usuario.activo,
  };
}

function serializarEmpresa(
  empresa: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...empresa,
    name: empresa.nombre,
    taxId: empresa.nit,
    mainCity: empresa.ciudadPrincipal,
    isActive: empresa.activo,
  };
}

function serializarAsignacion(
  asignacion: Record<string, unknown>
): Record<string, unknown> {
  const empresa =
    asignacion.empresa &&
    typeof asignacion.empresa ===
      "object"
      ? serializarEmpresa(
          asignacion.empresa as Record<
            string,
            unknown
          >
        )
      : asignacion.empresa;

  return {
    ...asignacion,
    companyId: asignacion.empresaId,
    professionalId:
      asignacion.profesionalId,
    assignmentRole:
      asignacion.rolAsignacion,
    startDate: asignacion.fechaInicio,
    endDate: asignacion.fechaFin,
    isActive: asignacion.activo,
    createdAt: asignacion.creadoEn,
    updatedAt: asignacion.actualizadoEn,
    company: empresa,
  };
}

function serializarProfesional(
  profesional: Prisma.ProfesionalGetPayload<{
    select: typeof seleccionProfesional;
  }>
) {
  const usuario =
    serializarUsuario(
      profesional.usuario
    );

  const asignaciones =
    profesional.asignacionesEmpresas.map(
      (asignacion) =>
        serializarAsignacion(
          asignacion as unknown as Record<
            string,
            unknown
          >
        )
    );

  return {
    ...profesional,

    // Relaciones en español.
    usuario,
    asignacionesEmpresas:
      asignaciones,

    // Alias temporales para el frontend anterior.
    identificationType:
      convertirTipoAnterior(
        profesional.tipoIdentificacion
      ),
    identificationNumber:
      profesional.numeroIdentificacion,
    firstNames: profesional.nombres,
    lastNames: profesional.apellidos,
    position: profesional.cargo,
    profession: profesional.profesion,
    professionalRole:
      profesional.rolProfesional,
    email: profesional.correo,
    phone: profesional.celular,
    address: profesional.direccion,
    isActive: profesional.activo,
    userId: profesional.usuarioId,
    createdAt: profesional.creadoEn,
    updatedAt:
      profesional.actualizadoEn,
    user: usuario,
    companyAssignments:
      asignaciones,
  };
}

async function validarUsuarioProfesional(
  usuarioId: string,
  profesionalId?: string
): Promise<{
  valido: boolean;
  error?: string;
}> {
  const usuario =
    await prisma.usuario.findUnique({
      where: {
        id: usuarioId,
      },
      include: {
        profesional: {
          select: {
            id: true,
          },
        },
      },
    });

  if (!usuario) {
    return {
      valido: false,
      error:
        "El usuario seleccionado no existe.",
    };
  }

  if (
    usuario.rol !==
    RolUsuario.PROFESIONAL
  ) {
    return {
      valido: false,
      error:
        "El usuario seleccionado debe tener rol PROFESIONAL.",
    };
  }

  if (
    usuario.profesional &&
    usuario.profesional.id !==
      profesionalId
  ) {
    return {
      valido: false,
      error:
        "El usuario ya está relacionado con otro profesional.",
    };
  }

  return {
    valido: true,
  };
}

export const controladorProfesional = {
  obtenerTodos: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const busqueda = normalizarTexto(
        req.query.busqueda ??
          req.query.search
      );

      const empresaId = normalizarTexto(
        req.query.empresaId ??
          req.query.companyId
      );

      const incluirInactivos =
        req.query.incluirInactivos ===
          "true" ||
        req.query.includeInactive ===
          "true";

      const where:
        Prisma.ProfesionalWhereInput =
          {};

      if (!incluirInactivos) {
        where.activo = true;
      }

      if (empresaId) {
        where.asignacionesEmpresas = {
          some: {
            empresaId,
            activo: true,
          },
        };
      }

      if (busqueda) {
        where.OR = [
          {
            nombres: {
              contains: busqueda,
            },
          },
          {
            apellidos: {
              contains: busqueda,
            },
          },
          {
            numeroIdentificacion: {
              contains: busqueda,
            },
          },
          {
            correo: {
              contains: busqueda,
            },
          },
          {
            profesion: {
              contains: busqueda,
            },
          },
          {
            rolProfesional: {
              contains: busqueda,
            },
          },
        ];
      }

      const profesionales =
        await prisma.profesional.findMany(
          {
            where,
            select:
              seleccionProfesional,
            orderBy: [
              {
                apellidos: "asc",
              },
              {
                nombres: "asc",
              },
            ],
          }
        );

      res.json(
        profesionales.map(
          serializarProfesional
        )
      );
    } catch (error) {
      console.error(
        "[PROFESIONAL-OBTENER-TODOS]",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener profesionales.",
      });
    }
  },

  obtenerMiPerfil: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (!req.user?.profesionalId) {
        res.status(404).json({
          error:
            "El usuario no tiene un perfil profesional relacionado.",
        });
        return;
      }

      const profesional =
        await prisma.profesional.findUnique(
          {
            where: {
              id: req.user.profesionalId,
            },
            select:
              seleccionProfesional,
          }
        );

      if (!profesional) {
        res.status(404).json({
          error:
            "Perfil profesional no encontrado.",
        });
        return;
      }

      res.json(
        serializarProfesional(
          profesional
        )
      );
    } catch (error) {
      console.error(
        "[PROFESIONAL-MI-PERFIL]",
        error
      );

      res.status(500).json({
        error:
          "Error al consultar el perfil profesional.",
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

      const tieneAcceso =
        esRolInterno(req.user.rol) ||
        req.user.profesionalId === id;

      if (!tieneAcceso) {
        res.status(403).json({
          error:
            "No tienes acceso a este perfil profesional.",
        });
        return;
      }

      const profesional =
        await prisma.profesional.findUnique(
          {
            where: {
              id,
            },
            select:
              seleccionProfesional,
          }
        );

      if (!profesional) {
        res.status(404).json({
          error:
            "Profesional no encontrado.",
        });
        return;
      }

      res.json(
        serializarProfesional(
          profesional
        )
      );
    } catch (error) {
      console.error(
        "[PROFESIONAL-OBTENER-POR-ID]",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener el profesional.",
      });
    }
  },

  crear: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const tipoIdentificacion =
        convertirTipoIdentificacion(
          obtenerCampo(
            req.body,
            "tipoIdentificacion",
            "identificationType"
          )
        );

      const numeroIdentificacion =
        normalizarTexto(
          obtenerCampo(
            req.body,
            "numeroIdentificacion",
            "identificationNumber"
          )
        );

      const nombres = normalizarTexto(
        obtenerCampo(
          req.body,
          "nombres",
          "firstNames"
        )
      );

      const apellidos =
        normalizarTexto(
          obtenerCampo(
            req.body,
            "apellidos",
            "lastNames"
          )
        );

      const correo = normalizarCorreo(
        obtenerCampo(
          req.body,
          "correo",
          "email"
        )
      );

      const usuarioId =
        normalizarTexto(
          obtenerCampo(
            req.body,
            "usuarioId",
            "userId"
          )
        ) || null;

      if (!tipoIdentificacion) {
        throw new ErrorValidacion(
          "El tipo de identificación no es válido."
        );
      }

      if (!numeroIdentificacion) {
        throw new ErrorValidacion(
          "El número de identificación es obligatorio."
        );
      }

      if (!nombres) {
        throw new ErrorValidacion(
          "Los nombres son obligatorios."
        );
      }

      if (!apellidos) {
        throw new ErrorValidacion(
          "Los apellidos son obligatorios."
        );
      }

      if (!correo) {
        throw new ErrorValidacion(
          "El correo electrónico es obligatorio."
        );
      }

      if (usuarioId) {
        const validacion =
          await validarUsuarioProfesional(
            usuarioId
          );

        if (!validacion.valido) {
          throw new ErrorValidacion(
            validacion.error ??
              "Usuario no válido."
          );
        }
      }

      const activoSolicitado =
        obtenerCampo(
          req.body,
          "activo",
          "isActive"
        );

      const profesional =
        await prisma.profesional.create({
          data: {
            tipoIdentificacion,
            numeroIdentificacion,
            nombres,
            apellidos,
            cargo: textoOpcional(
              obtenerCampo(
                req.body,
                "cargo",
                "position"
              )
            ),
            profesion: textoOpcional(
              obtenerCampo(
                req.body,
                "profesion",
                "profession"
              )
            ),
            rolProfesional: textoOpcional(
              obtenerCampo(
                req.body,
                "rolProfesional",
                "professionalRole"
              )
            ),
            correo,
            celular: textoOpcional(
              obtenerCampo(
                req.body,
                "celular",
                "phone"
              )
            ),
            direccion: textoOpcional(
              obtenerCampo(
                req.body,
                "direccion",
                "address"
              )
            ),
            usuarioId,
            activo:
              typeof activoSolicitado ===
              "boolean"
                ? activoSolicitado
                : true,
          },
          select:
            seleccionProfesional,
        });

      res
        .status(201)
        .json(
          serializarProfesional(
            profesional
          )
        );
    } catch (error) {
      console.error(
        "[PROFESIONAL-CREAR]",
        error
      );

      if (error instanceof ErrorValidacion) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          error:
            "Ya existe un profesional con esa identificación, correo o usuario.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al crear el profesional.",
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

      const actual =
        await prisma.profesional.findUnique(
          {
            where: {
              id,
            },
            select: {
              id: true,
              usuarioId: true,
            },
          }
        );

      if (!actual) {
        res.status(404).json({
          error:
            "Profesional no encontrado.",
        });
        return;
      }

      const esInterno =
        esRolInterno(req.user.rol);

      const esPerfilPropio =
        req.user.profesionalId === id;

      if (
        !esInterno &&
        !esPerfilPropio
      ) {
        res.status(403).json({
          error:
            "No tienes permiso para editar este profesional.",
        });
        return;
      }

      const data:
        Prisma.ProfesionalUncheckedUpdateInput =
          {};

      const nombresSolicitados =
        obtenerCampo(
          req.body,
          "nombres",
          "firstNames"
        );

      if (
        nombresSolicitados !== undefined
      ) {
        const nombres =
          normalizarTexto(
            nombresSolicitados
          );

        if (!nombres) {
          throw new ErrorValidacion(
            "Los nombres no pueden estar vacíos."
          );
        }

        data.nombres = nombres;
      }

      const apellidosSolicitados =
        obtenerCampo(
          req.body,
          "apellidos",
          "lastNames"
        );

      if (
        apellidosSolicitados !== undefined
      ) {
        const apellidos =
          normalizarTexto(
            apellidosSolicitados
          );

        if (!apellidos) {
          throw new ErrorValidacion(
            "Los apellidos no pueden estar vacíos."
          );
        }

        data.apellidos = apellidos;
      }

      const celularSolicitado =
        obtenerCampo(
          req.body,
          "celular",
          "phone"
        );
      if (
        celularSolicitado !== undefined
      ) {
        data.celular =
          textoOpcional(
            celularSolicitado
          );
      }

      const direccionSolicitada =
        obtenerCampo(
          req.body,
          "direccion",
          "address"
        );
      if (
        direccionSolicitada !== undefined
      ) {
        data.direccion =
          textoOpcional(
            direccionSolicitada
          );
      }

      const correoSolicitado =
        obtenerCampo(
          req.body,
          "correo",
          "email"
        );
      if (
        correoSolicitado !== undefined
      ) {
        const correo =
          normalizarCorreo(
            correoSolicitado
          );

        if (!correo) {
          throw new ErrorValidacion(
            "El correo no puede estar vacío."
          );
        }

        data.correo = correo;
      }

      if (esInterno) {
        const tipoSolicitado =
          obtenerCampo(
            req.body,
            "tipoIdentificacion",
            "identificationType"
          );

        if (tipoSolicitado !== undefined) {
          const tipo =
            convertirTipoIdentificacion(
              tipoSolicitado
            );

          if (!tipo) {
            throw new ErrorValidacion(
              "Tipo de identificación inválido."
            );
          }

          data.tipoIdentificacion = tipo;
        }

        const numeroSolicitado =
          obtenerCampo(
            req.body,
            "numeroIdentificacion",
            "identificationNumber"
          );

        if (
          numeroSolicitado !== undefined
        ) {
          const numero =
            normalizarTexto(
              numeroSolicitado
            );

          if (!numero) {
            throw new ErrorValidacion(
              "El número de identificación no puede estar vacío."
            );
          }

          data.numeroIdentificacion =
            numero;
        }

        const cargoSolicitado =
          obtenerCampo(
            req.body,
            "cargo",
            "position"
          );
        if (
          cargoSolicitado !== undefined
        ) {
          data.cargo =
            textoOpcional(
              cargoSolicitado
            );
        }

        const profesionSolicitada =
          obtenerCampo(
            req.body,
            "profesion",
            "profession"
          );
        if (
          profesionSolicitada !==
          undefined
        ) {
          data.profesion =
            textoOpcional(
              profesionSolicitada
            );
        }

        const rolSolicitado =
          obtenerCampo(
            req.body,
            "rolProfesional",
            "professionalRole"
          );
        if (
          rolSolicitado !== undefined
        ) {
          data.rolProfesional =
            textoOpcional(
              rolSolicitado
            );
        }

        const activoSolicitado =
          obtenerCampo(
            req.body,
            "activo",
            "isActive"
          );

        if (
          typeof activoSolicitado ===
          "boolean"
        ) {
          data.activo =
            activoSolicitado;
        }

        const usuarioSolicitado =
          obtenerCampo(
            req.body,
            "usuarioId",
            "userId"
          );

        if (
          usuarioSolicitado !== undefined
        ) {
          const usuarioId =
            normalizarTexto(
              usuarioSolicitado
            ) || null;

          if (usuarioId) {
            const validacion =
              await validarUsuarioProfesional(
                usuarioId,
                id
              );

            if (!validacion.valido) {
              throw new ErrorValidacion(
                validacion.error ??
                  "Usuario no válido."
              );
            }
          }

          data.usuarioId = usuarioId;
        }
      }

      const profesional =
        await prisma.profesional.update({
          where: {
            id,
          },
          data,
          select:
            seleccionProfesional,
        });

      res.json(
        serializarProfesional(
          profesional
        )
      );
    } catch (error) {
      console.error(
        "[PROFESIONAL-ACTUALIZAR]",
        error
      );

      if (error instanceof ErrorValidacion) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === "P2002") {
          res.status(409).json({
            error:
              "La identificación, el correo o el usuario ya están en uso.",
          });
          return;
        }

        if (error.code === "P2025") {
          res.status(404).json({
            error:
              "Profesional no encontrado.",
          });
          return;
        }
      }

      res.status(500).json({
        error:
          "Error al actualizar el profesional.",
      });
    }
  },

  eliminar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id = String(req.params.id);

      const profesional =
        await prisma.profesional.update({
          where: {
            id,
          },
          data: {
            activo: false,
          },
          select:
            seleccionProfesional,
        });

      const respuesta =
        serializarProfesional(
          profesional
        );

      res.json({
        mensaje:
          "Profesional desactivado correctamente.",
        message:
          "Profesional desactivado correctamente.",
        profesional: respuesta,
        professional: respuesta,
      });
    } catch (error) {
      console.error(
        "[PROFESIONAL-ELIMINAR]",
        error
      );

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          error:
            "Profesional no encontrado.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al desactivar el profesional.",
      });
    }
  },

  asignarEmpresa: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const profesionalId = String(
        req.params.id
      );

      const empresaId =
        normalizarTexto(
          obtenerCampo(
            req.body,
            "empresaId",
            "companyId"
          )
        );

      if (!empresaId) {
        throw new ErrorValidacion(
          "Debes seleccionar una empresa."
        );
      }

      const [profesional, empresa] =
        await Promise.all([
          prisma.profesional.findFirst({
            where: {
              id: profesionalId,
              activo: true,
            },
            select: {
              id: true,
            },
          }),

          prisma.empresa.findFirst({
            where: {
              id: empresaId,
              activo: true,
            },
            select: {
              id: true,
            },
          }),
        ]);

      if (!profesional) {
        throw new ErrorValidacion(
          "El profesional no existe o está inactivo."
        );
      }

      if (!empresa) {
        throw new ErrorValidacion(
          "La empresa no existe o está inactiva."
        );
      }

      const fechaInicio = fechaOpcional(
        obtenerCampo(
          req.body,
          "fechaInicio",
          "startDate"
        )
      );

      const fechaFin = fechaOpcional(
        obtenerCampo(
          req.body,
          "fechaFin",
          "endDate"
        )
      );

      if (
        fechaInicio &&
        fechaFin &&
        fechaFin < fechaInicio
      ) {
        throw new ErrorValidacion(
          "La fecha final no puede ser anterior a la fecha inicial."
        );
      }

      const rolAsignacion =
        textoOpcional(
          obtenerCampo(
            req.body,
            "rolAsignacion",
            "assignmentRole"
          )
        );

      const asignacion =
        await prisma.empresaProfesional.upsert(
          {
            where: {
              empresaId_profesionalId: {
                empresaId,
                profesionalId,
              },
            },

            update: {
              rolAsignacion,
              fechaInicio,
              fechaFin,
              activo: true,
            },

            create: {
              empresaId,
              profesionalId,
              rolAsignacion,
              fechaInicio,
              fechaFin,
              activo: true,
            },

            include: {
              empresa: true,
              profesional: true,
            },
          }
        );

      res
        .status(201)
        .json(
          serializarAsignacion(
            asignacion as unknown as Record<
              string,
              unknown
            >
          )
        );
    } catch (error) {
      console.error(
        "[PROFESIONAL-ASIGNAR-EMPRESA]",
        error
      );

      if (error instanceof ErrorValidacion) {
        res.status(400).json({
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al asignar el profesional a la empresa.",
      });
    }
  },

  retirarEmpresa: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const profesionalId = String(
        req.params.id
      );

      const empresaId = String(
        req.params.empresaId ??
          req.params.companyId
      );

      const asignacion =
        await prisma.empresaProfesional.update(
          {
            where: {
              empresaId_profesionalId: {
                empresaId,
                profesionalId,
              },
            },

            data: {
              activo: false,
              fechaFin: new Date(),
            },
          }
        );

      const respuesta =
        serializarAsignacion(
          asignacion as unknown as Record<
            string,
            unknown
          >
        );

      res.json({
        mensaje:
          "Asignación desactivada correctamente.",
        message:
          "Asignación desactivada correctamente.",
        asignacion: respuesta,
        assignment: respuesta,
      });
    } catch (error) {
      console.error(
        "[PROFESIONAL-RETIRAR-EMPRESA]",
        error
      );

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          error:
            "Asignación no encontrada.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al desactivar la asignación.",
      });
    }
  },
};

// Alias temporal: mantiene funcionando las rutas actuales.
export const professionalController = {
  getAll:
    controladorProfesional.obtenerTodos,
  getMe:
    controladorProfesional.obtenerMiPerfil,
  getById:
    controladorProfesional.obtenerPorId,
  create:
    controladorProfesional.crear,
  update:
    controladorProfesional.actualizar,
  delete:
    controladorProfesional.eliminar,
  assignCompany:
    controladorProfesional.asignarEmpresa,
  removeCompanyAssignment:
    controladorProfesional.retirarEmpresa,
};
