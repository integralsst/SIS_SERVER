import {
  EstadoAuditoriaSgsst,
  EstadoHallazgoAuditoria,
  EstadoRecomendacionAuditoria,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  ActualizarAuditoriaInput,
  ActualizarHallazgoAuditoriaInput,
  ActualizarRecomendacionAuditoriaInput,
  CambiarEstadoAuditoriaInput,
  ConsultaAuditorias,
  CrearAuditoriaInput,
  CrearHallazgoAuditoriaInput,
  CrearRecomendacionAuditoriaInput,
  CrearSeguimientoAuditoriaInput,
} from "../../types/auditorias.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  convertirFecha,
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import {
  asegurarEmpresaAccesible,
  construirFiltroEmpresasAccesibles,
} from "../empresas/acceso-empresas.service";

const ROLES_ESCRITURA: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
];

const ROLES_GLOBALES: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

function asegurarRolEscritura(usuario: UsuarioSesionEvaluacion): void {
  if (!ROLES_ESCRITURA.includes(usuario.rol)) {
    throw new ErrorEvaluacion(
      "Tu rol solo puede consultar auditorías.",
      403,
      "AUDITORIA_SOLO_LECTURA"
    );
  }
}

function convertirFechaOpcional(value: string | null | undefined, campo: string) {
  return value ? convertirFecha(value, campo, true) : null;
}

function paginacion(total: number, pagina: number, limite: number) {
  return {
    pagina,
    limite,
    total,
    paginas: Math.max(1, Math.ceil(total / limite)),
  };
}

async function obtenerPeriodoEmpresa(
  usuario: UsuarioSesionEvaluacion,
  empresaId: string,
  anio: number,
  escritura: boolean
) {
  await asegurarEmpresaAccesible(usuario, empresaId);
  if (escritura) asegurarRolEscritura(usuario);

  const periodo = await prisma.empresaPeriodo.findUnique({
    where: {
      empresaId_anio: {
        empresaId,
        anio,
      },
    },
    include: {
      empresa: {
        select: {
          id: true,
          nombre: true,
          nit: true,
        },
      },
      versionSupermatriz: {
        select: {
          id: true,
          nombre: true,
          estado: true,
        },
      },
    },
  });

  if (!periodo) {
    throw new ErrorEvaluacion(
      `La empresa no tiene abierto el periodo ${anio}. Abre primero el periodo anual de SG-SST.`,
      409,
      "AUDITORIA_PERIODO_NO_EXISTE"
    );
  }

  return periodo;
}

async function obtenerAuditoriaConAcceso(
  auditoriaId: string,
  usuario: UsuarioSesionEvaluacion,
  escritura = false
) {
  if (escritura) asegurarRolEscritura(usuario);

  const auditoria = await prisma.auditoriaSgsst.findUnique({
    where: { id: auditoriaId },
    include: {
      empresaPeriodo: {
        include: {
          empresa: {
            select: {
              id: true,
              nombre: true,
              nit: true,
              ciudadPrincipal: true,
            },
          },
          versionSupermatriz: {
            select: {
              id: true,
              nombre: true,
              estado: true,
            },
          },
        },
      },
      creadoPor: {
        select: {
          id: true,
          nombre: true,
          correo: true,
          rol: true,
        },
      },
    },
  });

  if (!auditoria) {
    throw new ErrorEvaluacion(
      "La auditoría seleccionada no existe.",
      404,
      "AUDITORIA_NO_ENCONTRADA"
    );
  }

  await asegurarEmpresaAccesible(
    usuario,
    auditoria.empresaPeriodo.empresaId
  );

  return auditoria;
}

async function validarAspectoPeriodo(
  versionSupermatrizId: number,
  aspectoId: number | null | undefined
) {
  if (!aspectoId) return null;

  const aspecto = await prisma.aspecto.findFirst({
    where: {
      id: aspectoId,
      versionSupermatrizId,
    },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      estandar: {
        select: {
          id: true,
          nombre: true,
        },
      },
      tareas: {
        where: { estado: "ACTIVO" },
        select: {
          id: true,
          proceso: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
        orderBy: { orden: "asc" },
      },
    },
  });

  if (!aspecto) {
    throw new ErrorEvaluacion(
      "El aspecto seleccionado no pertenece a la Supermatriz del periodo auditado.",
      409,
      "AUDITORIA_ASPECTO_INVALIDO"
    );
  }

  return aspecto;
}

async function validarResponsableEmpresa(
  empresaId: string,
  usuarioId: string | null | undefined
) {
  if (!usuarioId) return null;
  const ahora = new Date();

  const responsable = await prisma.usuario.findFirst({
    where: {
      id: usuarioId,
      activo: true,
      OR: [
        { empresaId },
        { rol: { in: ROLES_GLOBALES } },
        {
          profesional: {
            is: {
              activo: true,
              asignacionesEmpresas: {
                some: {
                  empresaId,
                  activo: true,
                  OR: [
                    { fechaFin: null },
                    { fechaFin: { gte: ahora } },
                  ],
                },
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
    },
  });

  if (!responsable) {
    throw new ErrorEvaluacion(
      "El responsable seleccionado no está activo o no tiene relación con la empresa auditada.",
      409,
      "AUDITORIA_RESPONSABLE_INVALIDO"
    );
  }

  return responsable;
}

function asegurarAuditoriaAdmiteContenido(estado: EstadoAuditoriaSgsst): void {
  if (estado === EstadoAuditoriaSgsst.FINALIZADA) {
    throw new ErrorEvaluacion(
      "La auditoría ya fue finalizada. Conserva sus hallazgos y recomendaciones como registro histórico; usa seguimientos para continuar la gestión.",
      409,
      "AUDITORIA_FINALIZADA"
    );
  }
  if (estado === EstadoAuditoriaSgsst.CANCELADA) {
    throw new ErrorEvaluacion(
      "La auditoría está cancelada.",
      409,
      "AUDITORIA_CANCELADA"
    );
  }
}

async function obtenerHallazgoConAcceso(
  hallazgoId: string,
  usuario: UsuarioSesionEvaluacion,
  escritura = false
) {
  const hallazgo = await prisma.hallazgoAuditoria.findUnique({
    where: { id: hallazgoId },
    include: {
      auditoria: {
        include: {
          empresaPeriodo: true,
        },
      },
      recomendaciones: true,
    },
  });

  if (!hallazgo) {
    throw new ErrorEvaluacion(
      "El hallazgo seleccionado no existe.",
      404,
      "HALLAZGO_AUDITORIA_NO_ENCONTRADO"
    );
  }

  await asegurarEmpresaAccesible(
    usuario,
    hallazgo.auditoria.empresaPeriodo.empresaId
  );
  if (escritura) asegurarRolEscritura(usuario);

  return hallazgo;
}

function puedeEditarContenidoFinalizado(
  auditoriaEstado: EstadoAuditoriaSgsst,
  campos: string[]
): boolean {
  if (auditoriaEstado !== EstadoAuditoriaSgsst.FINALIZADA) return true;
  return campos.every((campo) =>
    ["responsableUsuarioId", "fechaObjetivo"].includes(campo)
  );
}

export const servicioAuditorias = {
  listar: async (
    usuario: UsuarioSesionEvaluacion,
    consulta: ConsultaAuditorias
  ) => {
    if (consulta.empresaId) {
      await asegurarEmpresaAccesible(usuario, consulta.empresaId);
    }

    const filtroEmpresa = construirFiltroEmpresasAccesibles(usuario);
    const where: Prisma.AuditoriaSgsstWhereInput = {
      AND: [
        {
          empresaPeriodo: {
            is: {
              ...(consulta.empresaId ? { empresaId: consulta.empresaId } : {}),
              ...(consulta.anio ? { anio: consulta.anio } : {}),
              empresa: { is: filtroEmpresa },
            },
          },
        },
        ...(consulta.estado ? [{ estado: consulta.estado }] : []),
        ...(consulta.busqueda
          ? [
              {
                OR: [
                  { titulo: { contains: consulta.busqueda } },
                  { objetivo: { contains: consulta.busqueda } },
                  { alcance: { contains: consulta.busqueda } },
                  {
                    empresaPeriodo: {
                      is: {
                        empresa: {
                          is: {
                            OR: [
                              { nombre: { contains: consulta.busqueda } },
                              { nit: { contains: consulta.busqueda } },
                            ],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };

    const [total, auditorias] = await Promise.all([
      prisma.auditoriaSgsst.count({ where }),
      prisma.auditoriaSgsst.findMany({
        where,
        skip: (consulta.pagina - 1) * consulta.limite,
        take: consulta.limite,
        orderBy: [{ fechaAuditoria: "desc" }, { createdAt: "desc" }],
        include: {
          empresaPeriodo: {
            select: {
              id: true,
              anio: true,
              empresa: {
                select: {
                  id: true,
                  nombre: true,
                  nit: true,
                  ciudadPrincipal: true,
                },
              },
            },
          },
          creadoPor: {
            select: { id: true, nombre: true },
          },
          hallazgos: {
            select: { id: true, estado: true },
          },
        },
      }),
    ]);

    return {
      auditorias: auditorias.map((auditoria) => ({
        ...auditoria,
        resumen: {
          totalHallazgos: auditoria.hallazgos.length,
          hallazgosAbiertos: auditoria.hallazgos.filter(
            (item) =>
              item.estado === EstadoHallazgoAuditoria.ABIERTO ||
              item.estado === EstadoHallazgoAuditoria.EN_GESTION
          ).length,
        },
        hallazgos: undefined,
      })),
      paginacion: paginacion(total, consulta.pagina, consulta.limite),
    };
  },

  obtenerDetalle: async (
    auditoriaId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    await obtenerAuditoriaConAcceso(auditoriaId, usuario);

    return prisma.auditoriaSgsst.findUniqueOrThrow({
      where: { id: auditoriaId },
      include: {
        empresaPeriodo: {
          include: {
            empresa: {
              select: {
                id: true,
                nombre: true,
                nit: true,
                ciudadPrincipal: true,
              },
            },
            versionSupermatriz: {
              select: { id: true, nombre: true },
            },
          },
        },
        creadoPor: {
          select: { id: true, nombre: true, correo: true, rol: true },
        },
        hallazgos: {
          orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
          include: {
            aspecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                estandar: { select: { id: true, nombre: true } },
                tareas: {
                  where: { estado: "ACTIVO" },
                  select: {
                    id: true,
                    proceso: { select: { id: true, nombre: true } },
                  },
                  orderBy: { orden: "asc" },
                },
              },
            },
            responsable: {
              select: { id: true, nombre: true, correo: true, rol: true },
            },
            creadoPor: {
              select: { id: true, nombre: true },
            },
            recomendaciones: {
              orderBy: { createdAt: "asc" },
              include: {
                responsable: {
                  select: { id: true, nombre: true, correo: true, rol: true },
                },
                creadoPor: { select: { id: true, nombre: true } },
              },
            },
            seguimientos: {
              orderBy: { createdAt: "desc" },
              include: {
                usuario: { select: { id: true, nombre: true } },
                recomendacion: {
                  select: { id: true, descripcion: true },
                },
              },
            },
          },
        },
      },
    });
  },

  crear: async (
    data: CrearAuditoriaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const periodo = await obtenerPeriodoEmpresa(
      usuario,
      data.empresaId,
      data.anio,
      true
    );

    return prisma.auditoriaSgsst.create({
      data: {
        empresaPeriodoId: periodo.id,
        titulo: data.titulo.trim(),
        objetivo: data.objetivo?.trim() || null,
        alcance: data.alcance?.trim() || null,
        fechaAuditoria: convertirFecha(
          data.fechaAuditoria,
          "fechaAuditoria",
          true
        ) as Date,
        creadoPorUsuarioId: usuario.usuarioId,
      },
      include: {
        empresaPeriodo: {
          select: {
            id: true,
            anio: true,
            empresa: { select: { id: true, nombre: true, nit: true } },
          },
        },
        creadoPor: { select: { id: true, nombre: true } },
      },
    });
  },

  actualizar: async (
    auditoriaId: string,
    data: ActualizarAuditoriaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const auditoria = await obtenerAuditoriaConAcceso(
      auditoriaId,
      usuario,
      true
    );
    asegurarAuditoriaAdmiteContenido(auditoria.estado);

    return prisma.auditoriaSgsst.update({
      where: { id: auditoriaId },
      data: {
        ...(data.titulo !== undefined ? { titulo: data.titulo.trim() } : {}),
        ...(data.objetivo !== undefined
          ? { objetivo: data.objetivo?.trim() || null }
          : {}),
        ...(data.alcance !== undefined
          ? { alcance: data.alcance?.trim() || null }
          : {}),
        ...(data.fechaAuditoria !== undefined
          ? {
              fechaAuditoria: convertirFecha(
                data.fechaAuditoria,
                "fechaAuditoria",
                true
              ) as Date,
            }
          : {}),
      },
    });
  },

  cambiarEstado: async (
    auditoriaId: string,
    data: CambiarEstadoAuditoriaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const auditoria = await obtenerAuditoriaConAcceso(
      auditoriaId,
      usuario,
      true
    );

    if (
      auditoria.estado === EstadoAuditoriaSgsst.FINALIZADA ||
      auditoria.estado === EstadoAuditoriaSgsst.CANCELADA
    ) {
      throw new ErrorEvaluacion(
        "Una auditoría finalizada o cancelada no puede cambiar nuevamente de estado.",
        409,
        "AUDITORIA_ESTADO_FINAL"
      );
    }

    if (
      data.estado === EstadoAuditoriaSgsst.BORRADOR ||
      (auditoria.estado === EstadoAuditoriaSgsst.BORRADOR &&
        data.estado === EstadoAuditoriaSgsst.FINALIZADA)
    ) {
      throw new ErrorEvaluacion(
        "La transición de estado solicitada no es válida.",
        409,
        "AUDITORIA_TRANSICION_INVALIDA"
      );
    }

    if (
      data.estado === EstadoAuditoriaSgsst.CANCELADA &&
      !data.motivo?.trim()
    ) {
      throw new ErrorEvaluacion(
        "Debes indicar el motivo de cancelación.",
        400,
        "AUDITORIA_MOTIVO_CANCELACION_OBLIGATORIO"
      );
    }

    const ahora = new Date();

    return prisma.auditoriaSgsst.update({
      where: { id: auditoriaId },
      data: {
        estado: data.estado,
        ...(data.estado === EstadoAuditoriaSgsst.EN_EJECUCION
          ? { iniciadaEn: auditoria.iniciadaEn ?? ahora }
          : {}),
        ...(data.estado === EstadoAuditoriaSgsst.FINALIZADA
          ? { finalizadaEn: ahora }
          : {}),
        ...(data.estado === EstadoAuditoriaSgsst.CANCELADA
          ? {
              canceladaEn: ahora,
              motivoCancelacion: data.motivo?.trim() || null,
            }
          : {}),
      },
    });
  },

  crearHallazgo: async (
    auditoriaId: string,
    data: CrearHallazgoAuditoriaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const auditoria = await obtenerAuditoriaConAcceso(
      auditoriaId,
      usuario,
      true
    );
    asegurarAuditoriaAdmiteContenido(auditoria.estado);

    await Promise.all([
      validarAspectoPeriodo(
        auditoria.empresaPeriodo.versionSupermatrizId,
        data.aspectoId
      ),
      validarResponsableEmpresa(
        auditoria.empresaPeriodo.empresaId,
        data.responsableUsuarioId
      ),
    ]);

    return prisma.hallazgoAuditoria.create({
      data: {
        auditoriaId,
        aspectoId: data.aspectoId ?? null,
        tipo: data.tipo,
        titulo: data.titulo.trim(),
        descripcion: data.descripcion.trim(),
        evidencia: data.evidencia?.trim() || null,
        responsableUsuarioId: data.responsableUsuarioId ?? null,
        fechaObjetivo: convertirFechaOpcional(
          data.fechaObjetivo,
          "fechaObjetivo"
        ),
        creadoPorUsuarioId: usuario.usuarioId,
      },
    });
  },

  actualizarHallazgo: async (
    hallazgoId: string,
    data: ActualizarHallazgoAuditoriaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const hallazgo = await obtenerHallazgoConAcceso(
      hallazgoId,
      usuario,
      true
    );
    if (hallazgo.auditoria.estado === EstadoAuditoriaSgsst.CANCELADA) {
      throw new ErrorEvaluacion("La auditoría está cancelada.", 409, "AUDITORIA_CANCELADA");
    }

    const campos = Object.keys(data);
    if (!puedeEditarContenidoFinalizado(hallazgo.auditoria.estado, campos)) {
      throw new ErrorEvaluacion(
        "Después de finalizar la auditoría solo puedes ajustar responsable y fecha objetivo. El contenido del hallazgo queda histórico.",
        409,
        "HALLAZGO_HISTORICO_BLOQUEADO"
      );
    }

    await Promise.all([
      data.aspectoId !== undefined
        ? validarAspectoPeriodo(
            hallazgo.auditoria.empresaPeriodo.versionSupermatrizId,
            data.aspectoId
          )
        : Promise.resolve(null),
      data.responsableUsuarioId !== undefined
        ? validarResponsableEmpresa(
            hallazgo.auditoria.empresaPeriodo.empresaId,
            data.responsableUsuarioId
          )
        : Promise.resolve(null),
    ]);

    return prisma.hallazgoAuditoria.update({
      where: { id: hallazgoId },
      data: {
        ...(data.aspectoId !== undefined ? { aspectoId: data.aspectoId } : {}),
        ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data.titulo !== undefined ? { titulo: data.titulo.trim() } : {}),
        ...(data.descripcion !== undefined
          ? { descripcion: data.descripcion.trim() }
          : {}),
        ...(data.evidencia !== undefined
          ? { evidencia: data.evidencia?.trim() || null }
          : {}),
        ...(data.responsableUsuarioId !== undefined
          ? { responsableUsuarioId: data.responsableUsuarioId }
          : {}),
        ...(data.fechaObjetivo !== undefined
          ? {
              fechaObjetivo: convertirFechaOpcional(
                data.fechaObjetivo,
                "fechaObjetivo"
              ),
            }
          : {}),
      },
    });
  },

  crearRecomendacion: async (
    hallazgoId: string,
    data: CrearRecomendacionAuditoriaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const hallazgo = await obtenerHallazgoConAcceso(
      hallazgoId,
      usuario,
      true
    );
    asegurarAuditoriaAdmiteContenido(hallazgo.auditoria.estado);

    await validarResponsableEmpresa(
      hallazgo.auditoria.empresaPeriodo.empresaId,
      data.responsableUsuarioId
    );

    return prisma.recomendacionAuditoria.create({
      data: {
        hallazgoId,
        descripcion: data.descripcion.trim(),
        responsableUsuarioId: data.responsableUsuarioId ?? null,
        fechaObjetivo: convertirFechaOpcional(
          data.fechaObjetivo,
          "fechaObjetivo"
        ),
        creadoPorUsuarioId: usuario.usuarioId,
      },
    });
  },

  actualizarRecomendacion: async (
    recomendacionId: string,
    data: ActualizarRecomendacionAuditoriaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const recomendacion = await prisma.recomendacionAuditoria.findUnique({
      where: { id: recomendacionId },
      include: {
        hallazgo: {
          include: {
            auditoria: { include: { empresaPeriodo: true } },
          },
        },
      },
    });

    if (!recomendacion) {
      throw new ErrorEvaluacion(
        "La recomendación seleccionada no existe.",
        404,
        "RECOMENDACION_AUDITORIA_NO_ENCONTRADA"
      );
    }

    await asegurarEmpresaAccesible(
      usuario,
      recomendacion.hallazgo.auditoria.empresaPeriodo.empresaId
    );
    asegurarRolEscritura(usuario);

    if (
      recomendacion.hallazgo.auditoria.estado === EstadoAuditoriaSgsst.CANCELADA
    ) {
      throw new ErrorEvaluacion("La auditoría está cancelada.", 409, "AUDITORIA_CANCELADA");
    }

    const campos = Object.keys(data);
    if (
      !puedeEditarContenidoFinalizado(
        recomendacion.hallazgo.auditoria.estado,
        campos
      )
    ) {
      throw new ErrorEvaluacion(
        "Después de finalizar la auditoría solo puedes ajustar responsable y fecha objetivo. La recomendación queda histórica.",
        409,
        "RECOMENDACION_HISTORICA_BLOQUEADA"
      );
    }

    if (data.responsableUsuarioId !== undefined) {
      await validarResponsableEmpresa(
        recomendacion.hallazgo.auditoria.empresaPeriodo.empresaId,
        data.responsableUsuarioId
      );
    }

    return prisma.recomendacionAuditoria.update({
      where: { id: recomendacionId },
      data: {
        ...(data.descripcion !== undefined
          ? { descripcion: data.descripcion.trim() }
          : {}),
        ...(data.responsableUsuarioId !== undefined
          ? { responsableUsuarioId: data.responsableUsuarioId }
          : {}),
        ...(data.fechaObjetivo !== undefined
          ? {
              fechaObjetivo: convertirFechaOpcional(
                data.fechaObjetivo,
                "fechaObjetivo"
              ),
            }
          : {}),
      },
    });
  },

  registrarSeguimiento: async (
    hallazgoId: string,
    data: CrearSeguimientoAuditoriaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const hallazgo = await obtenerHallazgoConAcceso(
      hallazgoId,
      usuario,
      true
    );

    if (hallazgo.auditoria.estado === EstadoAuditoriaSgsst.CANCELADA) {
      throw new ErrorEvaluacion(
        "No se pueden registrar seguimientos en una auditoría cancelada.",
        409,
        "AUDITORIA_CANCELADA"
      );
    }

    const recomendacion = data.recomendacionId
      ? hallazgo.recomendaciones.find(
          (item) => item.id === data.recomendacionId
        )
      : null;

    if (data.recomendacionId && !recomendacion) {
      throw new ErrorEvaluacion(
        "La recomendación no pertenece al hallazgo seleccionado.",
        409,
        "RECOMENDACION_HALLAZGO_INVALIDA"
      );
    }

    return prisma.$transaction(async (tx) => {
      if (data.estadoHallazgo) {
        await tx.hallazgoAuditoria.update({
          where: { id: hallazgoId },
          data: {
            estado: data.estadoHallazgo,
            resueltoEn:
              data.estadoHallazgo === EstadoHallazgoAuditoria.RESUELTO ||
              data.estadoHallazgo === EstadoHallazgoAuditoria.CERRADO
                ? new Date()
                : null,
            cerradoEn:
              data.estadoHallazgo === EstadoHallazgoAuditoria.CERRADO
                ? new Date()
                : null,
          },
        });
      }

      if (recomendacion && data.estadoRecomendacion) {
        await tx.recomendacionAuditoria.update({
          where: { id: recomendacion.id },
          data: {
            estado: data.estadoRecomendacion,
            atendidaEn:
              data.estadoRecomendacion ===
              EstadoRecomendacionAuditoria.ATENDIDA
                ? new Date()
                : null,
          },
        });
      }

      return tx.seguimientoAuditoria.create({
        data: {
          hallazgoId,
          recomendacionId: recomendacion?.id ?? null,
          usuarioId: usuario.usuarioId,
          descripcion: data.descripcion.trim(),
          estadoHallazgo: data.estadoHallazgo ?? null,
          estadoRecomendacion: data.estadoRecomendacion ?? null,
        },
        include: {
          usuario: { select: { id: true, nombre: true } },
          recomendacion: { select: { id: true, descripcion: true } },
        },
      });
    });
  },

  obtenerContextoEmpresa: async (
    empresaId: string,
    anio: number | undefined,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const empresa = await asegurarEmpresaAccesible(usuario, empresaId);
    const ahora = new Date();

    const [periodos, responsables] = await Promise.all([
      prisma.empresaPeriodo.findMany({
        where: {
          empresaId,
          ...(anio ? { anio } : {}),
        },
        select: {
          id: true,
          anio: true,
          estado: true,
          versionSupermatrizId: true,
          versionSupermatriz: {
            select: { id: true, nombre: true, estado: true },
          },
        },
        orderBy: { anio: "desc" },
      }),
      prisma.usuario.findMany({
        where: {
          activo: true,
          OR: [
            { empresaId },
            { rol: { in: ROLES_GLOBALES } },
            {
              profesional: {
                is: {
                  activo: true,
                  asignacionesEmpresas: {
                    some: {
                      empresaId,
                      activo: true,
                      OR: [
                        { fechaFin: null },
                        { fechaFin: { gte: ahora } },
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          nombre: true,
          correo: true,
          rol: true,
        },
        orderBy: { nombre: "asc" },
      }),
    ]);

    const periodoSeleccionado = anio
      ? periodos.find((periodo) => periodo.anio === anio) ?? null
      : periodos[0] ?? null;

    const aspectos = periodoSeleccionado
      ? await prisma.aspecto.findMany({
          where: {
            versionSupermatrizId:
              periodoSeleccionado.versionSupermatrizId,
            estado: "ACTIVO",
          },
          select: {
            id: true,
            codigo: true,
            nombre: true,
            estandar: {
              select: { id: true, nombre: true },
            },
            tareas: {
              where: { estado: "ACTIVO" },
              select: {
                id: true,
                proceso: { select: { id: true, nombre: true } },
              },
              orderBy: { orden: "asc" },
            },
          },
          orderBy: { orden: "asc" },
        })
      : [];

    return {
      empresa,
      periodos,
      periodoSeleccionado,
      responsables,
      aspectos,
      permisos: {
        puedeEditar: ROLES_ESCRITURA.includes(usuario.rol),
      },
    };
  },
};
