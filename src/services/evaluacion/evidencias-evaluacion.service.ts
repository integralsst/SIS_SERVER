import {
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  ActualizarEvidenciaEvaluacionInput,
  CrearEvidenciaEvaluacionInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import {
  comoJsonPrismaEvaluacion,
  convertirFecha,
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import { asegurarAccesoGestion } from "./acceso-evaluacion.service";
import { obtenerEstadoEvidenciaEvaluacion } from "./estado-evidencia-aspecto.service";

function normalizarTextoObligatorio(
  value: unknown,
  nombreCampo: string,
  limite = 191
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ErrorEvaluacion(
      `El campo ${nombreCampo} es obligatorio.`
    );
  }

  const texto = value.trim();

  if (texto.length > limite) {
    throw new ErrorEvaluacion(
      `El campo ${nombreCampo} no puede superar ${limite} caracteres.`
    );
  }

  return texto;
}

function normalizarTextoOpcional(
  value: unknown
): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function normalizarUrl(value: unknown): string {
  const texto = normalizarTextoObligatorio(
    value,
    "url",
    2000
  );

  let url: URL;

  try {
    url = new URL(texto);
  } catch {
    throw new ErrorEvaluacion(
      "La URL de la evidencia no es válida."
    );
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ErrorEvaluacion(
      "La evidencia debe usar una URL http o https."
    );
  }

  return url.toString();
}

async function buscarEvaluacionConContexto(
  evaluacionId: string
) {
  return prisma.evaluacionAspecto.findUnique({
    where: {
      id: evaluacionId,
    },
    include: {
      gestion: {
        include: {
          empresaPeriodo: true,
        },
      },
      aspecto: {
        include: {
          configuracionEvidencia: true,
        },
      },
    },
  });
}

async function obtenerEvaluacionParaCrearEvidencia(
  evaluacionId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const evaluacion = await buscarEvaluacionConContexto(
    evaluacionId
  );

  if (!evaluacion) {
    throw new ErrorEvaluacion(
      "La evaluación seleccionada no existe.",
      404,
      "EVALUACION_NO_ENCONTRADA"
    );
  }

  const gestion = await asegurarAccesoGestion(
    usuario,
    evaluacion.gestionId,
    "ESCRITURA"
  );

  if (!gestion.valida) {
    throw new ErrorEvaluacion(
      "La gestión está invalidada.",
      409,
      "GESTION_INVALIDADA"
    );
  }

  if (
    gestion.empresaPeriodo.estado !==
    EstadoPeriodoSgsst.ABIERTO
  ) {
    throw new ErrorEvaluacion(
      "El periodo está cerrado.",
      409,
      "PERIODO_CERRADO"
    );
  }

  if (gestion.estado === EstadoGestionSgsst.BORRADOR) {
    return {
      evaluacion,
      posteriorFinalizacion: false,
    };
  }

  if (gestion.estado !== EstadoGestionSgsst.FINALIZADA) {
    throw new ErrorEvaluacion(
      "La gestión no permite agregar evidencias.",
      409,
      "GESTION_NO_EDITABLE"
    );
  }

  if (
    !evaluacion.aspecto.configuracionEvidencia
      ?.requiereEvidencia
  ) {
    throw new ErrorEvaluacion(
      "Solo se pueden completar soportes después de finalizar cuando el aspecto exige evidencia.",
      409,
      "EVIDENCIA_POSTERIOR_NO_REQUERIDA"
    );
  }

  if (
    evaluacion.estadoCumplimiento !==
      EstadoCumplimientoAspecto.CUMPLIDO ||
    evaluacion.calificacionAdministrativa.toNumber() !== 5
  ) {
    throw new ErrorEvaluacion(
      "La carga posterior está reservada para aspectos cumplidos en 5 con evidencia requerida pendiente.",
      409,
      "EVIDENCIA_POSTERIOR_NO_APLICA"
    );
  }

  const ultimaEvaluacion =
    await prisma.evaluacionAspecto.findFirst({
      where: {
        aspectoId: evaluacion.aspectoId,
        gestion: {
          empresaPeriodoId:
            evaluacion.gestion.empresaPeriodoId,
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
        },
      },
      orderBy: [
        {
          gestion: {
            fechaGestion: "desc",
          },
        },
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
      },
    });

  if (ultimaEvaluacion?.id !== evaluacion.id) {
    throw new ErrorEvaluacion(
      "La evidencia pendiente debe completarse sobre la evaluación vigente más reciente del aspecto.",
      409,
      "EVALUACION_NO_VIGENTE"
    );
  }

  const { estadoEvidencia } =
    await obtenerEstadoEvidenciaEvaluacion(evaluacionId);

  if (!estadoEvidencia?.evidenciaPendiente) {
    throw new ErrorEvaluacion(
      "La evaluación finalizada ya cuenta con un soporte activo que satisface el requisito de evidencia.",
      409,
      "EVIDENCIA_PENDIENTE_COMPLETADA"
    );
  }

  return {
    evaluacion,
    posteriorFinalizacion: true,
  };
}

async function obtenerEvaluacionEditable(
  evaluacionId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const evaluacion = await buscarEvaluacionConContexto(
    evaluacionId
  );

  if (!evaluacion) {
    throw new ErrorEvaluacion(
      "La evaluación seleccionada no existe.",
      404,
      "EVALUACION_NO_ENCONTRADA"
    );
  }

  const gestion = await asegurarAccesoGestion(
    usuario,
    evaluacion.gestionId,
    "ESCRITURA"
  );

  if (!gestion.valida) {
    throw new ErrorEvaluacion(
      "La gestión está invalidada.",
      409,
      "GESTION_INVALIDADA"
    );
  }

  if (gestion.estado !== EstadoGestionSgsst.BORRADOR) {
    throw new ErrorEvaluacion(
      "Las evidencias de una gestión finalizada son de solo lectura.",
      409,
      "GESTION_NO_EDITABLE"
    );
  }

  if (
    gestion.empresaPeriodo.estado !==
    EstadoPeriodoSgsst.ABIERTO
  ) {
    throw new ErrorEvaluacion(
      "El periodo está cerrado.",
      409,
      "PERIODO_CERRADO"
    );
  }

  return evaluacion;
}

async function obtenerEvidenciaEditable(
  evidenciaId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const evidencia =
    await prisma.evidenciaEvaluacion.findUnique({
      where: {
        id: evidenciaId,
      },
      include: {
        evaluacion: {
          include: {
            gestion: {
              include: {
                empresaPeriodo: true,
              },
            },
            aspecto: {
              include: {
                configuracionEvidencia: true,
              },
            },
          },
        },
      },
    });

  if (!evidencia || !evidencia.activo) {
    throw new ErrorEvaluacion(
      "La evidencia seleccionada no existe.",
      404,
      "EVIDENCIA_NO_ENCONTRADA"
    );
  }

  await obtenerEvaluacionEditable(
    evidencia.evaluacionId,
    usuario
  );

  return evidencia;
}

function serializarEvidencia(evidencia: {
  id: string;
  evaluacionId: string;
  nombre: string;
  url: string;
  descripcion: string | null;
  fechaDocumento: Date | null;
  visibleCliente: boolean;
  activo: boolean;
  usuarioCreadorId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...evidencia,
    fechaDocumento:
      evidencia.fechaDocumento?.toISOString() ?? null,
    createdAt: evidencia.createdAt.toISOString(),
    updatedAt: evidencia.updatedAt.toISOString(),
  };
}

export const servicioEvidenciasEvaluacion = {
  crear: async (
    evaluacionId: string,
    data: CrearEvidenciaEvaluacionInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const {
      evaluacion,
      posteriorFinalizacion,
    } = await obtenerEvaluacionParaCrearEvidencia(
      evaluacionId,
      usuario
    );

    const nombre = normalizarTextoObligatorio(
      data.nombre,
      "nombre"
    );
    const url = normalizarUrl(data.url);
    const descripcion = normalizarTextoOpcional(
      data.descripcion
    );
    const fechaDocumento = convertirFecha(
      data.fechaDocumento,
      "fechaDocumento"
    );
    const visibleCliente =
      typeof data.visibleCliente === "boolean"
        ? data.visibleCliente
        : evaluacion.aspecto.configuracionEvidencia
            ?.visibleClienteDefault ?? false;

    return prisma.$transaction(async (tx) => {
      if (posteriorFinalizacion) {
        const soporteExistente =
          await tx.evaluacionAspecto.findUnique({
            where: {
              id: evaluacionId,
            },
            select: {
              evidencias: {
                where: {
                  activo: true,
                },
                select: {
                  id: true,
                },
                take: 1,
              },
              seguimientosCompromiso: {
                select: {
                  compromiso: {
                    select: {
                      evidencias: {
                        where: {
                          activa: true,
                        },
                        select: {
                          id: true,
                        },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          });

        const tieneSoporteCompromiso =
          soporteExistente?.seguimientosCompromiso.some(
            ({ compromiso }) =>
              compromiso.evidencias.length > 0
          ) ?? false;

        if (
          (soporteExistente?.evidencias.length ?? 0) > 0 ||
          tieneSoporteCompromiso
        ) {
          throw new ErrorEvaluacion(
            "La evidencia pendiente ya fue completada mediante un soporte activo.",
            409,
            "EVIDENCIA_PENDIENTE_COMPLETADA"
          );
        }
      }

      const evidencia =
        await tx.evidenciaEvaluacion.create({
          data: {
            evaluacionId,
            nombre,
            url,
            descripcion,
            fechaDocumento,
            visibleCliente,
            usuarioCreadorId: usuario.usuarioId,
          },
        });

      await tx.historialEvaluacion.create({
        data: {
          gestionId: evaluacion.gestionId,
          evaluacionId,
          usuarioId: usuario.usuarioId,
          accion: posteriorFinalizacion
            ? "COMPLETAR_EVIDENCIA_PENDIENTE"
            : "CREAR_EVIDENCIA",
          descripcion: posteriorFinalizacion
            ? `Se completó la evidencia pendiente ${nombre} después de finalizar la gestión.`
            : `Se agregó la evidencia ${nombre}.`,
          datosDespues:
            comoJsonPrismaEvaluacion(evidencia),
        },
      });

      return serializarEvidencia(evidencia);
    });
  },

  actualizar: async (
    evidenciaId: string,
    data: ActualizarEvidenciaEvaluacionInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const anterior = await obtenerEvidenciaEditable(
      evidenciaId,
      usuario
    );

    const cambios: Prisma.EvidenciaEvaluacionUpdateInput = {};

    if (data.nombre !== undefined) {
      cambios.nombre = normalizarTextoObligatorio(
        data.nombre,
        "nombre"
      );
    }

    if (data.url !== undefined) {
      cambios.url = normalizarUrl(data.url);
    }

    if (data.descripcion !== undefined) {
      cambios.descripcion = normalizarTextoOpcional(
        data.descripcion
      );
    }

    if (data.fechaDocumento !== undefined) {
      cambios.fechaDocumento = convertirFecha(
        data.fechaDocumento,
        "fechaDocumento"
      );
    }

    if (data.visibleCliente !== undefined) {
      cambios.visibleCliente = Boolean(
        data.visibleCliente
      );
    }

    if (Object.keys(cambios).length === 0) {
      throw new ErrorEvaluacion(
        "No se enviaron cambios para la evidencia."
      );
    }

    return prisma.$transaction(async (tx) => {
      const actualizada =
        await tx.evidenciaEvaluacion.update({
          where: {
            id: evidenciaId,
          },
          data: cambios,
        });

      await tx.historialEvaluacion.create({
        data: {
          gestionId: anterior.evaluacion.gestionId,
          evaluacionId: anterior.evaluacionId,
          usuarioId: usuario.usuarioId,
          accion: "ACTUALIZAR_EVIDENCIA",
          descripcion: `Se actualizó la evidencia ${actualizada.nombre}.`,
          datosAntes:
            comoJsonPrismaEvaluacion(anterior),
          datosDespues:
            comoJsonPrismaEvaluacion(actualizada),
        },
      });

      return serializarEvidencia(actualizada);
    });
  },

  desactivar: async (
    evidenciaId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const anterior = await obtenerEvidenciaEditable(
      evidenciaId,
      usuario
    );

    return prisma.$transaction(async (tx) => {
      const desactivada =
        await tx.evidenciaEvaluacion.update({
          where: {
            id: evidenciaId,
          },
          data: {
            activo: false,
          },
        });

      await tx.historialEvaluacion.create({
        data: {
          gestionId: anterior.evaluacion.gestionId,
          evaluacionId: anterior.evaluacionId,
          usuarioId: usuario.usuarioId,
          accion: "DESACTIVAR_EVIDENCIA",
          descripcion: `Se retiró la evidencia ${anterior.nombre}.`,
          datosAntes:
            comoJsonPrismaEvaluacion(anterior),
          datosDespues:
            comoJsonPrismaEvaluacion(desactivada),
        },
      });

      return {
        id: desactivada.id,
        activo: desactivada.activo,
      };
    });
  },
};
