import {
  EstadoCumplimientoAspecto,
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  CrearEvidenciaEvaluacionInput,
  UsuarioSesionEvaluacion,
} from "../../types/evaluacion.types";
import {
  comoJsonPrismaEvaluacion,
  convertirFecha,
  ErrorEvaluacion,
} from "../../utils/evaluacion";
import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";
import { obtenerEstadoEvidenciaEvaluacion } from "./estado-evidencia-aspecto.service";
import { TIPO_ACTIVIDAD_EVALUACION_DIRECTA } from "./evaluacion-directa.constants";
import { asegurarEvaluacionVigenteParaEvidencia } from "./vigencia-evidencia-evaluacion.service";

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

async function obtenerEvaluacionHistoricaFinalizada(
  evaluacionId: string
) {
  const evaluacion = await prisma.evaluacionAspecto.findUnique({
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

  if (
    !evaluacion ||
    evaluacion.gestion.estado !== EstadoGestionSgsst.FINALIZADA ||
    evaluacion.gestion.tipoActividad ===
      TIPO_ACTIVIDAD_EVALUACION_DIRECTA
  ) {
    return null;
  }

  return evaluacion;
}

export const servicioEvidenciasEvaluacionHistorica = {
  esEvaluacionHistoricaFinalizada: async (
    evaluacionId: string
  ): Promise<boolean> => {
    const evaluacion =
      await obtenerEvaluacionHistoricaFinalizada(evaluacionId);

    return Boolean(evaluacion);
  },

  crear: async (
    evaluacionId: string,
    data: CrearEvidenciaEvaluacionInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const evaluacion =
      await obtenerEvaluacionHistoricaFinalizada(evaluacionId);

    if (!evaluacion) {
      throw new ErrorEvaluacion(
        "La evaluación histórica seleccionada no está disponible para completar evidencias.",
        409,
        "EVALUACION_HISTORICA_NO_EDITABLE"
      );
    }

    await asegurarAccesoEmpresa(
      usuario,
      evaluacion.gestion.empresaPeriodo.empresaId,
      "ESCRITURA"
    );

    if (!evaluacion.gestion.valida) {
      throw new ErrorEvaluacion(
        "La gestión histórica está invalidada.",
        409,
        "GESTION_INVALIDADA"
      );
    }

    if (
      evaluacion.gestion.empresaPeriodo.estado !==
      EstadoPeriodoSgsst.ABIERTO
    ) {
      throw new ErrorEvaluacion(
        "El periodo está cerrado.",
        409,
        "PERIODO_CERRADO"
      );
    }

    if (
      !evaluacion.aspecto.configuracionEvidencia
        ?.requiereEvidencia
    ) {
      throw new ErrorEvaluacion(
        "Esta evaluación histórica no requiere completar soporte documental.",
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

    await asegurarEvaluacionVigenteParaEvidencia(
      evaluacionId
    );

    const { estadoEvidencia } =
      await obtenerEstadoEvidenciaEvaluacion(evaluacionId);

    if (!estadoEvidencia?.evidenciaPendiente) {
      throw new ErrorEvaluacion(
        "La evaluación histórica ya cuenta con un soporte activo que satisface el requisito de evidencia.",
        409,
        "EVIDENCIA_PENDIENTE_COMPLETADA"
      );
    }

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
          accion: "COMPLETAR_EVIDENCIA_PENDIENTE",
          descripcion: `Se completó la evidencia pendiente ${nombre} sobre una evaluación histórica finalizada.`,
          datosDespues:
            comoJsonPrismaEvaluacion(evidencia),
        },
      });

      return serializarEvidencia(evidencia);
    });
  },
};
