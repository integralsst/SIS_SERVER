import { Request, Response } from "express";
import {
  ClaseRiesgo,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../lib/prisma";
import { esRolInterno } from "../utils/access";

class ErrorValidacion extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorValidacion";
  }
}

function tienePropiedad(
  objeto: Record<string, unknown>,
  propiedad: string
): boolean {
  return Object.prototype.hasOwnProperty.call(
    objeto,
    propiedad
  );
}

function obtenerCampo(
  body: Record<string, unknown>,
  nombreEspanol: string,
  nombreAnterior: string
): unknown {
  if (tienePropiedad(body, nombreEspanol)) {
    return body[nombreEspanol];
  }

  if (tienePropiedad(body, nombreAnterior)) {
    return body[nombreAnterior];
  }

  return undefined;
}

function normalizarTexto(value: unknown): string {
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

function correoOpcional(
  value: unknown
): string | null {
  const correo = textoOpcional(value);

  if (!correo) {
    return null;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      correo
    )
  ) {
    throw new ErrorValidacion(
      `Correo inválido: ${correo}`
    );
  }

  return correo.toLowerCase();
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
      "La fecha proporcionada no es válida."
    );
  }

  return fecha;
}

function enteroNoNegativo(
  value: unknown,
  nombreCampo: string
): number {
  const numero = Number(value);

  if (
    !Number.isInteger(numero) ||
    numero < 0
  ) {
    throw new ErrorValidacion(
      `${nombreCampo} debe ser un número entero mayor o igual a cero.`
    );
  }

  return numero;
}

function esRolProfesionalConAsignacion(
  rol: RolUsuario
): boolean {
  return (
    rol === RolUsuario.PROFESIONAL ||
    rol === RolUsuario.COORDINADOR
  );
}

function construirFiltroAsignacionVigente(
  profesionalId: string,
  empresaId?: string
): Prisma.EmpresaProfesionalWhereInput {
  const ahora = new Date();

  return {
    ...(empresaId ? { empresaId } : {}),
    profesionalId,
    activo: true,
    OR: [
      {
        fechaFin: null,
      },
      {
        fechaFin: {
          gte: ahora,
        },
      },
    ],
  };
}

function construirDatosEmpresa(
  body: Record<string, unknown>,
  parcial = false
): Prisma.EmpresaUncheckedUpdateInput {
  const data: Prisma.EmpresaUncheckedUpdateInput =
    {};

  const nombre = obtenerCampo(
    body,
    "nombre",
    "name"
  );

  if (!parcial || nombre !== undefined) {
    const valor = normalizarTexto(nombre);

    if (!valor) {
      throw new ErrorValidacion(
        "La razón social es obligatoria."
      );
    }

    data.nombre = valor;
  }

  const nit = obtenerCampo(
    body,
    "nit",
    "taxId"
  );

  if (!parcial || nit !== undefined) {
    const valor = normalizarTexto(nit);

    if (!valor) {
      throw new ErrorValidacion(
        "El NIT es obligatorio."
      );
    }

    data.nit = valor;
  }

  const direccionPrincipal = obtenerCampo(
    body,
    "direccionPrincipal",
    "mainAddress"
  );
  if (direccionPrincipal !== undefined) {
    data.direccionPrincipal =
      textoOpcional(direccionPrincipal);
  }

  const ciudadPrincipal = obtenerCampo(
    body,
    "ciudadPrincipal",
    "mainCity"
  );
  if (ciudadPrincipal !== undefined) {
    data.ciudadPrincipal =
      textoOpcional(ciudadPrincipal);
  }

  const codigoActividadEconomica =
    obtenerCampo(
      body,
      "codigoActividadEconomica",
      "economicActivityCode"
    );
  if (
    codigoActividadEconomica !== undefined
  ) {
    data.codigoActividadEconomica =
      textoOpcional(
        codigoActividadEconomica
      );
  }

  const descripcionActividadEconomica =
    obtenerCampo(
      body,
      "descripcionActividadEconomica",
      "economicActivityDescription"
    );
  if (
    descripcionActividadEconomica !==
    undefined
  ) {
    data.descripcionActividadEconomica =
      textoOpcional(
        descripcionActividadEconomica
      );
  }

  const descripcionEmpresa = obtenerCampo(
    body,
    "descripcionEmpresa",
    "companyDescription"
  );
  if (descripcionEmpresa !== undefined) {
    data.descripcionEmpresa =
      textoOpcional(descripcionEmpresa);
  }

  const nombreGerente = obtenerCampo(
    body,
    "nombreGerente",
    "managerName"
  );
  if (nombreGerente !== undefined) {
    data.nombreGerente =
      textoOpcional(nombreGerente);
  }

  const nombreContactoSst = obtenerCampo(
    body,
    "nombreContactoSst",
    "sstContactName"
  );
  if (nombreContactoSst !== undefined) {
    data.nombreContactoSst =
      textoOpcional(nombreContactoSst);
  }

  const correoEmpresa = obtenerCampo(
    body,
    "correoEmpresa",
    "companyEmail"
  );
  if (correoEmpresa !== undefined) {
    data.correoEmpresa =
      correoOpcional(correoEmpresa);
  }

  const correoGerente = obtenerCampo(
    body,
    "correoGerente",
    "managerEmail"
  );
  if (correoGerente !== undefined) {
    data.correoGerente =
      correoOpcional(correoGerente);
  }

  const correoContactoSst = obtenerCampo(
    body,
    "correoContactoSst",
    "sstContactEmail"
  );
  if (correoContactoSst !== undefined) {
    data.correoContactoSst =
      correoOpcional(correoContactoSst);
  }

  const fechaInicio = obtenerCampo(
    body,
    "fechaInicio",
    "startDate"
  );
  if (fechaInicio !== undefined) {
    data.fechaInicio =
      fechaOpcional(fechaInicio);
  }

  const claseRiesgoPrincipal = obtenerCampo(
    body,
    "claseRiesgoPrincipal",
    "mainRiskClass"
  );

  if (claseRiesgoPrincipal !== undefined) {
    if (
      claseRiesgoPrincipal === null ||
      claseRiesgoPrincipal === ""
    ) {
      data.claseRiesgoPrincipal = null;
    } else if (
      Object.values(ClaseRiesgo).includes(
        claseRiesgoPrincipal as ClaseRiesgo
      )
    ) {
      data.claseRiesgoPrincipal =
        claseRiesgoPrincipal as ClaseRiesgo;
    } else {
      throw new ErrorValidacion(
        "La clase de riesgo debe ser I, II, III, IV o V."
      );
    }
  }

  const visitasSstConvenidas =
    obtenerCampo(
      body,
      "visitasSstConvenidas",
      "agreedSstVisits"
    );
  if (visitasSstConvenidas !== undefined) {
    data.visitasSstConvenidas =
      enteroNoNegativo(
        visitasSstConvenidas,
        "Las visitas SST"
      );
  }

  const visitasEmergenciasConvenidas =
    obtenerCampo(
      body,
      "visitasEmergenciasConvenidas",
      "agreedEmergencyVisits"
    );
  if (
    visitasEmergenciasConvenidas !==
    undefined
  ) {
    data.visitasEmergenciasConvenidas =
      enteroNoNegativo(
        visitasEmergenciasConvenidas,
        "Las visitas de emergencias"
      );
  }

  const activo = obtenerCampo(
    body,
    "activo",
    "isActive"
  );
  if (activo !== undefined) {
    if (typeof activo !== "boolean") {
      throw new ErrorValidacion(
        "El estado de la empresa debe ser verdadero o falso."
      );
    }

    data.activo = activo;
  }

  return data;
}

function serializarProfesional(
  profesional: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...profesional,
    identificationType:
      profesional.tipoIdentificacion,
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
    updatedAt: profesional.actualizadoEn,
  };
}

function serializarAsignacion(
  asignacion: Record<string, unknown>
): Record<string, unknown> {
  const profesional =
    asignacion.profesional &&
    typeof asignacion.profesional ===
      "object"
      ? serializarProfesional(
          asignacion.profesional as Record<
            string,
            unknown
          >
        )
      : asignacion.profesional;

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
    professional: profesional,
  };
}

function serializarEmpresa(
  empresa: Record<string, unknown>
): Record<string, unknown> {
  const asignaciones =
    Array.isArray(
      empresa.asignacionesProfesionales
    )
      ? empresa.asignacionesProfesionales.map(
          (asignacion) =>
            serializarAsignacion(
              asignacion as Record<
                string,
                unknown
              >
            )
        )
      : undefined;

  const conteo =
    empresa._count &&
    typeof empresa._count === "object"
      ? (empresa._count as Record<
          string,
          unknown
        >)
      : undefined;

  return {
    ...empresa,

    // Alias temporales para el frontend anterior.
    taxId: empresa.nit,
    name: empresa.nombre,
    startDate: empresa.fechaInicio,
    mainAddress:
      empresa.direccionPrincipal,
    mainCity: empresa.ciudadPrincipal,
    companyEmail: empresa.correoEmpresa,
    companyDescription:
      empresa.descripcionEmpresa,
    mainRiskClass:
      empresa.claseRiesgoPrincipal,
    economicActivityCode:
      empresa.codigoActividadEconomica,
    economicActivityDescription:
      empresa.descripcionActividadEconomica,
    managerName: empresa.nombreGerente,
    managerEmail: empresa.correoGerente,
    sstContactName:
      empresa.nombreContactoSst,
    sstContactEmail:
      empresa.correoContactoSst,
    agreedSstVisits:
      empresa.visitasSstConvenidas,
    agreedEmergencyVisits:
      empresa.visitasEmergenciasConvenidas,
    isActive: empresa.activo,
    createdAt: empresa.creadoEn,
    updatedAt: empresa.actualizadoEn,

    professionalAssignments:
      asignaciones,

    _count: conteo
      ? {
          ...conteo,
          users: conteo.usuarios ?? 0,
          professionalAssignments:
            conteo.asignacionesProfesionales ??
            0,
        }
      : undefined,
  };
}

async function puedeAccederEmpresa(
  usuario: Express.UsuarioAutenticado,
  empresaId: string
): Promise<boolean> {
  if (esRolInterno(usuario.rol)) {
    return true;
  }

  if (usuario.empresaId === empresaId) {
    return true;
  }

  if (
    esRolProfesionalConAsignacion(usuario.rol) &&
    usuario.profesionalId
  ) {
    const asignacion =
      await prisma.empresaProfesional.findFirst({
        where: construirFiltroAsignacionVigente(
          usuario.profesionalId,
          empresaId
        ),
        select: {
          id: true,
        },
      });

    return Boolean(asignacion);
  }

  return false;
}

export const controladorEmpresa = {
  crear: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const data = construirDatosEmpresa(
        req.body,
        false
      );

      const empresa =
        await prisma.empresa.create({
          data:
            data as Prisma.EmpresaUncheckedCreateInput,
        });

      res
        .status(201)
        .json(
          serializarEmpresa(
            empresa as unknown as Record<
              string,
              unknown
            >
          )
        );
    } catch (error) {
      console.error(
        "[EMPRESA-CREAR]",
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
            "Ya existe una empresa con ese NIT.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al crear la empresa.",
      });
    }
  },

  obtenerTodas: async (
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

      const incluirInactivas =
        req.query.incluirInactivas ===
          "true" ||
        req.query.includeInactive ===
          "true";

      const filtros: Prisma.EmpresaWhereInput[] =
        [];

      if (
        !esRolInterno(req.user.rol) ||
        !incluirInactivas
      ) {
        filtros.push({
          activo: true,
        });
      }

      if (busqueda) {
        filtros.push({
          OR: [
            {
              nombre: {
                contains: busqueda,
              },
            },
            {
              nit: {
                contains: busqueda,
              },
            },
            {
              ciudadPrincipal: {
                contains: busqueda,
              },
            },
          ],
        });
      }

      if (!esRolInterno(req.user.rol)) {
        if (
          esRolProfesionalConAsignacion(
            req.user.rol
          ) &&
          req.user.profesionalId
        ) {
          filtros.push({
            asignacionesProfesionales: {
              some: construirFiltroAsignacionVigente(
                req.user.profesionalId
              ),
            },
          });
        } else if (req.user.empresaId) {
          filtros.push({
            id: req.user.empresaId,
          });
        } else {
          filtros.push({
            id: "__SIN_EMPRESA__",
          });
        }
      }

      const empresas =
        await prisma.empresa.findMany({
          where: {
            AND: filtros,
          },
          include: {
            _count: {
              select: {
                usuarios: true,
                asignacionesProfesionales:
                  true,
              },
            },
          },
          orderBy: {
            nombre: "asc",
          },
        });

      res.json(
        empresas.map((empresa) =>
          serializarEmpresa(
            empresa as unknown as Record<
              string,
              unknown
            >
          )
        )
      );
    } catch (error) {
      console.error(
        "[EMPRESA-OBTENER-TODAS]",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener las empresas.",
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

      const permitido =
        await puedeAccederEmpresa(
          req.user,
          id
        );

      if (!permitido) {
        res.status(403).json({
          error:
            "No tienes acceso a esta empresa.",
        });
        return;
      }

      const empresa =
        await prisma.empresa.findUnique({
          where: {
            id,
          },
          include: {
            asignacionesProfesionales: {
              where: {
                activo: true,
              },
              include: {
                profesional: {
                  select: {
                    id: true,
                    tipoIdentificacion:
                      true,
                    numeroIdentificacion:
                      true,
                    nombres: true,
                    apellidos: true,
                    correo: true,
                    celular: true,
                    profesion: true,
                    rolProfesional: true,
                    activo: true,
                  },
                },
              },
            },
            _count: {
              select: {
                usuarios: true,
                asignacionesProfesionales:
                  true,
              },
            },
          },
        });

      if (!empresa) {
        res.status(404).json({
          error: "Empresa no encontrada.",
        });
        return;
      }

      res.json(
        serializarEmpresa(
          empresa as unknown as Record<
            string,
            unknown
          >
        )
      );
    } catch (error) {
      console.error(
        "[EMPRESA-OBTENER-POR-ID]",
        error
      );

      res.status(500).json({
        error:
          "Error al obtener la empresa.",
      });
    }
  },

  actualizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id = String(req.params.id);

      const data = construirDatosEmpresa(
        req.body,
        true
      );

      const empresa =
        await prisma.empresa.update({
          where: {
            id,
          },
          data,
        });

      res.json(
        serializarEmpresa(
          empresa as unknown as Record<
            string,
            unknown
          >
        )
      );
    } catch (error) {
      console.error(
        "[EMPRESA-ACTUALIZAR]",
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
              "Ya existe una empresa con ese NIT.",
          });
          return;
        }

        if (error.code === "P2025") {
          res.status(404).json({
            error:
              "Empresa no encontrada.",
          });
          return;
        }
      }

      res.status(500).json({
        error:
          "Error al actualizar la empresa.",
      });
    }
  },

  eliminar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const id = String(req.params.id);

      const empresa =
        await prisma.empresa.update({
          where: {
            id,
          },
          data: {
            activo: false,
          },
        });

      const respuesta =
        serializarEmpresa(
          empresa as unknown as Record<
            string,
            unknown
          >
        );

      res.json({
        mensaje:
          "Empresa desactivada correctamente.",
        message:
          "Empresa desactivada correctamente.",
        empresa: respuesta,
        company: respuesta,
      });
    } catch (error) {
      console.error(
        "[EMPRESA-ELIMINAR]",
        error
      );

      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        res.status(404).json({
          error:
            "Empresa no encontrada.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Error al desactivar la empresa.",
      });
    }
  },
};

// Alias temporal: mantiene funcionando las rutas actuales.
export const companyController = {
  create: controladorEmpresa.crear,
  getAll: controladorEmpresa.obtenerTodas,
  getById: controladorEmpresa.obtenerPorId,
  update: controladorEmpresa.actualizar,
  delete: controladorEmpresa.eliminar,
};
