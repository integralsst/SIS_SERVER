import {
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import { construirAccesoDetalleCompromiso } from "./acceso-compromisos.service";
import { obtenerVentanaVencimiento } from "./fechas-compromiso.service";
import {
  seleccionCompromisoListado,
  serializarCompromisoListado,
} from "./presentacion-compromiso.service";

export async function obtenerDetalleCompromiso(
  compromisoId: string,
  usuario: UsuarioSesionEvaluacion
) {
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
        ...seleccionCompromisoListado,
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

  const {
    hoy,
    limiteProximo,
  } = obtenerVentanaVencimiento();

  return {
    ...serializarCompromisoListado(
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
}
