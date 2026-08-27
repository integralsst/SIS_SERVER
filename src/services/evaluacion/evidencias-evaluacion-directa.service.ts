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
import { TIPO_ACTIVIDAD_EVALUACION_DIRECTA } from "./evaluacion-directa.constants";
import { asegurarEvaluacionVigenteParaEvidencia } from "./vigencia-evidencia-evaluacion.service";

function textoObligatorio(
  value: unknown,
  campo: string,
  limite = 191
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ErrorEvaluacion(`El campo ${campo} es obligatorio.`);
  }

  const texto = value.trim();
  if (texto.length > limite) {
    throw new ErrorEvaluacion(
      `El campo ${campo} no puede superar ${limite} caracteres.`
    );
  }

  return texto;
}

function textoOpcional(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function urlValida(value: unknown): string {
  const texto = textoObligatorio(value, "url", 2000);
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

async function obtenerEvaluacionDirecta(
  evaluacionId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const evaluacion = await prisma.evaluacionAspecto.findUnique({
    where: { id: evaluacionId },
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

  if (
    evaluacion.gestion.tipoActividad !==
    TIPO_ACTIVIDAD_EVALUACION_DIRECTA
  ) {
    return null;
  }

  const gestion = await asegurarAccesoGestion(
    usuario,
    evaluacion.gestionId,
    "ESCRITURA"
  );

  if (
    !gestion.valida ||
    gestion.estado !== EstadoGestionSgsst.FINALIZADA
  ) {
    throw new ErrorEvaluacion(
      "La evaluación directa no está disponible para gestionar soportes.",
      409,
      "EVALUACION_DIRECTA_NO_EDITABLE"
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

  await asegurarEvaluacionVigenteParaEvidencia(evaluacionId);

  return evaluacion;
}

async function obtenerEvidenciaDirecta(
  evidenciaId: string,
  usuario: UsuarioSesionEvaluacion
) {
  const evidencia = await prisma.evidenciaEvaluacion.findUnique({
    where: { id: evidenciaId },
    include: {
      evaluacion: {
        select: {
          id: true,
          gestion: {
            select: {
              tipoActividad: true,
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

  if (
    evidencia.evaluacion.gestion.tipoActividad !==
    TIPO_ACTIVIDAD_EVALUACION_DIRECTA
  ) {
    return null;
  }

  await obtenerEvaluacionDirecta(
    evidencia.evaluacion.id,
    usuario
  );

  return evidencia;
}

function serializar(evidencia: {
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

export const servicioEvidenciasEvaluacionDirecta = {
  esEvaluacionDirecta: async (
    evaluacionId: string
  ): Promise<boolean> => {
    const evaluacion = await prisma.evaluacionAspecto.findUnique({
      where: { id: evaluacionId },
      select: {
        gestion: {
          select: { tipoActividad: true },
        },
      },
    });

    return (
      evaluacion?.gestion.tipoActividad ===
      TIPO_ACTIVIDAD_EVALUACION_DIRECTA
    );
  },

  esEvidenciaDirecta: async (
    evidenciaId: string
  ): Promise<boolean> => {
    const evidencia = await prisma.evidenciaEvaluacion.findUnique({
      where: { id: evidenciaId },
      select: {
        evaluacion: {
          select: {
            gestion: {
              select: { tipoActividad: true },
            },
          },
        },
      },
    });

    return (
      evidencia?.evaluacion.gestion.tipoActividad ===
      TIPO_ACTIVIDAD_EVALUACION_DIRECTA
    );
  },

  crear: async (
    evaluacionId: string,
    data: CrearEvidenciaEvaluacionInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const evaluacion = await obtenerEvaluacionDirecta(
      evaluacionId,
      usuario
    );

    if (!evaluacion) {
      throw new ErrorEvaluacion(
        "La evaluación no pertenece al flujo de evaluación directa."
      );
    }

    const nombre = textoObligatorio(data.nombre, "nombre");
    const url = urlValida(data.url);
    const descripcion = textoOpcional(data.descripcion);
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
      const evidencia = await tx.evidenciaEvaluacion.create({
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
          descripcion: `Se agregó la evidencia ${nombre} a la evaluación directa.`,
          datosDespues: comoJsonPrismaEvaluacion(evidencia),
        },
      });

      return serializar(evidencia);
    });
  },

  actualizar: async (
    evidenciaId: string,
    data: ActualizarEvidenciaEvaluacionInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const anterior = await obtenerEvidenciaDirecta(
      evidenciaId,
      usuario
    );

    if (!anterior) {
      throw new ErrorEvaluacion(
        "La evidencia no pertenece al flujo de evaluación directa."
      );
    }

    const cambios: Prisma.EvidenciaEvaluacionUpdateInput = {};

    if (data.nombre !== undefined) {
      cambios.nombre = textoObligatorio(data.nombre, "nombre");
    }
    if (data.url !== undefined) {
      cambios.url = urlValida(data.url);
    }
    if (data.descripcion !== undefined) {
      cambios.descripcion = textoOpcional(data.descripcion);
    }
    if (data.fechaDocumento !== undefined) {
      cambios.fechaDocumento = convertirFecha(
        data.fechaDocumento,
        "fechaDocumento"
      );
    }
    if (data.visibleCliente !== undefined) {
      cambios.visibleCliente = Boolean(data.visibleCliente);
    }

    if (Object.keys(cambios).length === 0) {
      throw new ErrorEvaluacion(
        "No se enviaron cambios para la evidencia."
      );
    }

    return prisma.$transaction(async (tx) => {
      const actualizada = await tx.evidenciaEvaluacion.update({
        where: { id: evidenciaId },
        data: cambios,
      });

      await tx.historialEvaluacion.create({
        data: {
          gestionId: anterior.evaluacionId
            ? (
                await tx.evaluacionAspecto.findUniqueOrThrow({
                  where: { id: anterior.evaluacionId },
                  select: { gestionId: true },
                })
              ).gestionId
            : "",
          evaluacionId: anterior.evaluacionId,
          usuarioId: usuario.usuarioId,
          accion: "ACTUALIZAR_EVIDENCIA",
          descripcion: `Se actualizó la evidencia ${actualizada.nombre}.`,
          datosAntes: comoJsonPrismaEvaluacion(anterior),
          datosDespues: comoJsonPrismaEvaluacion(actualizada),
        },
      });

      return serializar(actualizada);
    });
  },

  desactivar: async (
    evidenciaId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const anterior = await obtenerEvidenciaDirecta(
      evidenciaId,
      usuario
    );

    if (!anterior) {
      throw new ErrorEvaluacion(
        "La evidencia no pertenece al flujo de evaluación directa."
      );
    }

    return prisma.$transaction(async (tx) => {
      const desactivada = await tx.evidenciaEvaluacion.update({
        where: { id: evidenciaId },
        data: { activo: false },
      });
      const evaluacion = await tx.evaluacionAspecto.findUniqueOrThrow({
        where: { id: anterior.evaluacionId },
        select: { gestionId: true },
      });

      await tx.historialEvaluacion.create({
        data: {
          gestionId: evaluacion.gestionId,
          evaluacionId: anterior.evaluacionId,
          usuarioId: usuario.usuarioId,
          accion: "DESACTIVAR_EVIDENCIA",
          descripcion: `Se retiró la evidencia ${anterior.nombre}.`,
          datosAntes: comoJsonPrismaEvaluacion(anterior),
          datosDespues: comoJsonPrismaEvaluacion(desactivada),
        },
      });

      return serializar(desactivada);
    });
  },
};
