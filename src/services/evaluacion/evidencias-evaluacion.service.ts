import {
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

async function obtenerEvaluacionEditable(
  evaluacionId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const evaluacion =
    await prisma.evaluacionAspecto.findUnique({
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
    const evaluacion = await obtenerEvaluacionEditable(
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
          accion: "CREAR_EVIDENCIA",
          descripcion: `Se agregó la evidencia ${nombre}.`,
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
