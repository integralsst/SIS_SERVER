import {
  EstadoAsignacionCompromiso,
  EstadoCompromiso,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  ConsultaCompromisosInput,
  FiltroVencimientoCompromiso,
} from "../../types/compromisos/consulta-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import {
  construirAccesoDetalleCompromiso,
  construirAccesoListadoCompromisos,
} from "./acceso-compromisos.service";

const ESTADOS_ABIERTOS: EstadoCompromiso[] = [
  EstadoCompromiso.EN_EJECUCION,
  EstadoCompromiso.PENDIENTE_DE_REASIGNACION,
  EstadoCompromiso.SOLICITUD_DE_CIERRE,
];

function inicioDiaActual(): Date {
  const fecha = new Date();

  fecha.setUTCHours(0, 0, 0, 0);

  return fecha;
}

function limiteProximosDias(
  fechaBase: Date
): Date {
  const limite = new Date(fechaBase);

  limite.setUTCDate(limite.getUTCDate() + 30);

  return limite;
}

function filtroVencimiento(
  valor: FiltroVencimientoCompromiso,
  hoy: Date,
  limiteProximo: Date
): Prisma.CompromisoWhereInput {
  switch (valor) {
    case "VENCIDOS":
      return {
        estado: {
          in: ESTADOS_ABIERTOS,
        },
        fechaLimite: {
          lt: hoy,
        },
      };

    case "PROXIMOS_30_DIAS":
      return {
        estado: {
          in: ESTADOS_ABIERTOS,
        },
        fechaLimite: {
          gte: hoy,
          lte: limiteProximo,
        },
      };

    case "VIGENTES":
      return {
        estado: {
          in: ESTADOS_ABIERTOS,
        },
        fechaLimite: {
          gt: limiteProximo,
        },
      };

    case "CERRADOS":
      return {
        estado: {
          in: [
            EstadoCompromiso.CUMPLIDO,
            EstadoCompromiso.CANCELADO,
          ],
        },
      };

    default:
      return {};
  }
}

function construirFiltrosBase(
  consulta: ConsultaCompromisosInput,
  usuario: UsuarioSesionEvaluacion
): Prisma.CompromisoWhereInput {
  const filtros: Prisma.CompromisoWhereInput[] = [
    construirAccesoListadoCompromisos(
      usuario,
      consulta.alcance
    ),
  ];

  if (consulta.empresaId) {
    filtros.push({
      empresaId: consulta.empresaId,
    });
  }

  if (consulta.responsableId) {
    filtros.push({
      responsables: {
        some: {
          usuarioResponsableId:
            consulta.responsableId,
          estado:
            EstadoAsignacionCompromiso.ASIGNADA,
        },
      },
    });
  }

  if (consulta.busqueda) {
    filtros.push({
      OR: [
        {
          descripcion: {
            contains: consulta.busqueda,
          },
        },
        {
          aspectoCodigo: {
            contains: consulta.busqueda,
          },
        },
        {
          aspecto: {
            nombre: {
              contains: consulta.busqueda,
            },
          },
        },
        {
          empresa: {
            nombre: {
              contains: consulta.busqueda,
            },
          },
        },
        {
          empresa: {
            nit: {
              contains: consulta.busqueda,
            },
          },
        },
      ],
    });
  }

  return {
    AND: filtros,
  };
}

function construirFiltroEstado(
  consulta: ConsultaCompromisosInput
): Prisma.CompromisoWhereInput {
  if (consulta.estado === "ABIERTOS") {
    return {
      estado: {
        in: ESTADOS_ABIERTOS,
      },
    };
  }

  if (consulta.estado) {
    return {
      estado: consulta.estado,
    };
  }

  return {};
}

function calcularSemaforo(
  estado: EstadoCompromiso,
  fechaLimite: Date,
  hoy: Date,
  limiteProximo: Date
):
  | "VENCIDO"
  | "PROXIMO_A_VENCER"
  | "VIGENTE"
  | "CERRADO" {
  if (!ESTADOS_ABIERTOS.includes(estado)) {
    return "CERRADO";
  }

  if (fechaLimite < hoy) {
    return "VENCIDO";
  }

  if (fechaLimite <= limiteProximo) {
    return "PROXIMO_A_VENCER";
  }

  return "VIGENTE";
}

const seleccionListado = {
  id: true,
  descripcion: true,
  recursos: true,
  fechaLimite: true,
  estado: true,
  createdAt: true,
  updatedAt: true,
  empresa: {
    select: {
      id: true,
      nombre: true,
      nit: true,
    },
  },
  aspecto: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
    },
  },
  gestionOrigen: {
    select: {
      id: true,
      fechaGestion: true,
      tipoActividad: true,
    },
  },
  responsables: {
    where: {
      estado:
        EstadoAsignacionCompromiso.ASIGNADA,
    },
    select: {
      id: true,
      tipo: true,
      estado: true,
      usuarioResponsable: {
        select: {
          id: true,
          nombre: true,
          correo: true,
          rol: true,
        },
      },
      actividad: {
        select: {
          id: true,
          descripcion: true,
          estado: true,
          atendidaEn: true,
        },
      },
    },
    orderBy: {
      asignadoEn: "asc",
    },
  },
} satisfies Prisma.CompromisoSelect;

function serializarListado(
  compromiso: Prisma.CompromisoGetPayload<{
    select: typeof seleccionListado;
  }>,
  hoy: Date,
  limiteProximo: Date
) {
  const responsables = [
    ...compromiso.responsables,
  ].sort((primero, segundo) => {
    if (primero.tipo === segundo.tipo) {
      return primero.usuarioResponsable.nombre.localeCompare(
        segundo.usuarioResponsable.nombre,
        "es"
      );
    }

    return primero.tipo === "PRINCIPAL" ? -1 : 1;
  });

  return {
    ...compromiso,
    fechaLimite:
      compromiso.fechaLimite.toISOString(),
    createdAt: compromiso.createdAt.toISOString(),
    updatedAt: compromiso.updatedAt.toISOString(),
    gestionOrigen: {
      ...compromiso.gestionOrigen,
      fechaGestion:
        compromiso.gestionOrigen.fechaGestion.toISOString(),
    },
    responsables,
    semaforo: calcularSemaforo(
      compromiso.estado,
      compromiso.fechaLimite,
      hoy,
      limiteProximo
    ),
  };
}

export const servicioConsultaCompromisos = {
  listar: async (
    consulta: ConsultaCompromisosInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const hoy = inicioDiaActual();
    const limiteProximo =
      limiteProximosDias(hoy);
    const filtrosBase = construirFiltrosBase(
      consulta,
      usuario
    );

    const whereListado: Prisma.CompromisoWhereInput =
      {
        AND: [
          filtrosBase,
          construirFiltroEstado(consulta),
          filtroVencimiento(
            consulta.vencimiento,
            hoy,
            limiteProximo
          ),
        ],
      };

    const [
      compromisos,
      totalFiltrado,
      total,
      abiertos,
      vencidos,
      proximos,
      cumplidos,
    ] = await prisma.$transaction([
      prisma.compromiso.findMany({
        where: whereListado,
        select: seleccionListado,
        orderBy: [
          {
            fechaLimite: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
        skip:
          (consulta.pagina - 1) *
          consulta.limite,
        take: consulta.limite,
      }),
      prisma.compromiso.count({
        where: whereListado,
      }),
      prisma.compromiso.count({
        where: filtrosBase,
      }),
      prisma.compromiso.count({
        where: {
          AND: [
            filtrosBase,
            {
              estado: {
                in: ESTADOS_ABIERTOS,
              },
            },
          ],
        },
      }),
      prisma.compromiso.count({
        where: {
          AND: [
            filtrosBase,
            {
              estado: {
                in: ESTADOS_ABIERTOS,
              },
              fechaLimite: {
                lt: hoy,
              },
            },
          ],
        },
      }),
      prisma.compromiso.count({
        where: {
          AND: [
            filtrosBase,
            {
              estado: {
                in: ESTADOS_ABIERTOS,
              },
              fechaLimite: {
                gte: hoy,
                lte: limiteProximo,
              },
            },
          ],
        },
      }),
      prisma.compromiso.count({
        where: {
          AND: [
            filtrosBase,
            {
              estado:
                EstadoCompromiso.CUMPLIDO,
            },
          ],
        },
      }),
    ]);

    return {
      alcance: consulta.alcance,
      resumen: {
        total,
        abiertos,
        vencidos,
        proximosAVencer: proximos,
        cumplidos,
      },
      paginacion: {
        pagina: consulta.pagina,
        limite: consulta.limite,
        total: totalFiltrado,
        totalPaginas: Math.max(
          1,
          Math.ceil(
            totalFiltrado / consulta.limite
          )
        ),
      },
      compromisos: compromisos.map(
        (compromiso) =>
          serializarListado(
            compromiso,
            hoy,
            limiteProximo
          )
      ),
    };
  },

  obtenerDetalle: async (
    compromisoId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const compromiso =
      await prisma.compromiso.findFirst({
        where: {
          AND: [
            {
              id: compromisoId,
            },
            construirAccesoDetalleCompromiso(
              usuario
            ),
          ],
        },
        select: {
          ...seleccionListado,
          evaluacionOrigen: {
            select: {
              id: true,
              estadoCumplimiento: true,
              calificacionAdministrativa: true,
              observacion: true,
              createdAt: true,
            },
          },
          evaluacionesSeguimiento: {
            select: {
              createdAt: true,
              evaluacion: {
                select: {
                  id: true,
                  estadoCumplimiento: true,
                  calificacionAdministrativa: true,
                  observacion: true,
                  createdAt: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          seguimientos: {
            select: {
              id: true,
              fechaSeguimiento: true,
              descripcion: true,
              origen: true,
              visibleCliente: true,
              usuario: {
                select: {
                  id: true,
                  nombre: true,
                  rol: true,
                },
              },
            },
            orderBy: {
              fechaSeguimiento: "desc",
            },
            take: 50,
          },
          evidencias: {
            where: {
              activa: true,
            },
            select: {
              id: true,
              nombre: true,
              url: true,
              descripcion: true,
              fechaDocumento: true,
              visibleCliente: true,
              createdAt: true,
              creadoPor: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          historial: {
            select: {
              id: true,
              entidadTipo: true,
              entidadId: true,
              accion: true,
              descripcion: true,
              createdAt: true,
              usuario: {
                select: {
                  id: true,
                  nombre: true,
                  rol: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 50,
          },
        },
      });

    if (!compromiso) {
      throw new ErrorEvaluacion(
        "El compromiso no existe o no está dentro de tu alcance.",
        404,
        "COMPROMISO_NO_ENCONTRADO"
      );
    }

    const hoy = inicioDiaActual();
    const limiteProximo =
      limiteProximosDias(hoy);

    return {
      ...serializarListado(
        compromiso,
        hoy,
        limiteProximo
      ),
      evaluacionOrigen: {
        ...compromiso.evaluacionOrigen,
        calificacionAdministrativa:
          compromiso.evaluacionOrigen.calificacionAdministrativa.toNumber(),
        createdAt:
          compromiso.evaluacionOrigen.createdAt.toISOString(),
      },
      evaluacionesSeguimiento:
        compromiso.evaluacionesSeguimiento.map(
          (seguimiento) => ({
            ...seguimiento,
            createdAt:
              seguimiento.createdAt.toISOString(),
            evaluacion: {
              ...seguimiento.evaluacion,
              calificacionAdministrativa:
                seguimiento.evaluacion.calificacionAdministrativa.toNumber(),
              createdAt:
                seguimiento.evaluacion.createdAt.toISOString(),
            },
          })
        ),
      seguimientos:
        compromiso.seguimientos.map(
          (seguimiento) => ({
            ...seguimiento,
            fechaSeguimiento:
              seguimiento.fechaSeguimiento.toISOString(),
          })
        ),
      evidencias:
        compromiso.evidencias.map(
          (evidencia) => ({
            ...evidencia,
            fechaDocumento:
              evidencia.fechaDocumento?.toISOString() ??
              null,
            createdAt:
              evidencia.createdAt.toISOString(),
          })
        ),
      historial:
        compromiso.historial.map(
          (registro) => ({
            ...registro,
            createdAt:
              registro.createdAt.toISOString(),
          })
        ),
    };
  },
};
