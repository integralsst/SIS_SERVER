import { EstadoGestionSgsst } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  asegurarAccesoEmpresa,
  asegurarCapacidadParticipanteGestion,
} from "./acceso-evaluacion.service";
import { TIPO_ACTIVIDAD_EVALUACION_DIRECTA } from "./evaluacion-directa.constants";

interface ObjetivoEvidenciaDetalle {
  evaluacionId: string;
  esBorrador: boolean;
}

interface PermisosEvidenciaDetalle {
  puedeGestionarEvidencias: boolean;
  puedeCompletarEvidenciaPendiente?: boolean;
  motivoEvidencias: string | null;
}

interface ResultadoPermisosEvidenciaDetalle {
  evidenciaObjetivo?: ObjetivoEvidenciaDetalle | null;
  evidenciaPendienteObjetivo?: ObjetivoEvidenciaDetalle | null;
  permisos: PermisosEvidenciaDetalle;
}

async function obtenerContextoGestionEvidencia(
  evaluacionId: string
) {
  return prisma.evaluacionAspecto.findUnique({
    where: { id: evaluacionId },
    select: {
      gestionId: true,
      gestion: {
        select: {
          estado: true,
          tipoActividad: true,
          empresaPeriodo: {
            select: {
              empresaId: true,
            },
          },
        },
      },
    },
  });
}

async function usuarioPuedeGestionarEvaluacion(
  evaluacionId: string,
  usuario: UsuarioSesionEvaluacion
): Promise<boolean> {
  const evaluacion = await obtenerContextoGestionEvidencia(
    evaluacionId
  );

  if (!evaluacion) {
    return false;
  }

  try {
    if (
      evaluacion.gestion.estado ===
      EstadoGestionSgsst.FINALIZADA
    ) {
      await asegurarAccesoEmpresa(
        usuario,
        evaluacion.gestion.empresaPeriodo.empresaId,
        "ESCRITURA"
      );
      return true;
    }

    await asegurarCapacidadParticipanteGestion(
      usuario,
      evaluacion.gestionId,
      "EVIDENCIAS"
    );
    return true;
  } catch {
    return false;
  }
}

async function evaluacionEsDirecta(
  evaluacionId: string
): Promise<boolean> {
  const evaluacion = await obtenerContextoGestionEvidencia(
    evaluacionId
  );

  return (
    evaluacion?.gestion.tipoActividad ===
    TIPO_ACTIVIDAD_EVALUACION_DIRECTA
  );
}

export async function alinearPermisosEvidenciasDetalle<
  T extends ResultadoPermisosEvidenciaDetalle,
>(
  resultado: T,
  usuario: UsuarioSesionEvaluacion
): Promise<T> {
  const objetivoActual = resultado.evidenciaObjetivo;
  const objetivoPendiente = resultado.evidenciaPendienteObjetivo;
  const objetivoActualEsDirecto = Boolean(
    objetivoActual &&
      (await evaluacionEsDirecta(objetivoActual.evaluacionId))
  );
  const objetivoActualEditable = Boolean(
    objetivoActual &&
      (objetivoActual.esBorrador || objetivoActualEsDirecto)
  );

  const puedeGestionarEvidencias = Boolean(
    objetivoActualEditable &&
      objetivoActual &&
      (await usuarioPuedeGestionarEvaluacion(
        objetivoActual.evaluacionId,
        usuario
      ))
  );

  const puedeCompletarEvidenciaPendiente =
    Boolean(
      resultado.permisos.puedeCompletarEvidenciaPendiente &&
        objetivoPendiente
    ) &&
    Boolean(
      objetivoPendiente &&
        (await usuarioPuedeGestionarEvaluacion(
          objetivoPendiente.evaluacionId,
          usuario
        ))
    );

  let motivoEvidencias = resultado.permisos.motivoEvidencias;

  if (objetivoActualEditable && !puedeGestionarEvidencias) {
    motivoEvidencias = objetivoActualEsDirecto
      ? "Tu perfil profesional no permite gestionar soportes de esta evaluación."
      : "Tu participación en esta gestión no permite gestionar evidencias.";
  } else if (objetivoActualEsDirecto && puedeGestionarEvidencias) {
    motivoEvidencias = null;
  } else if (
    objetivoPendiente &&
    puedeCompletarEvidenciaPendiente
  ) {
    motivoEvidencias = null;
  } else if (
    objetivoPendiente &&
    !puedeCompletarEvidenciaPendiente
  ) {
    motivoEvidencias =
      "La evaluación finalizada conserva su calificación 5, pero tu perfil no tiene acceso de escritura a esta empresa para completar el soporte documental.";
  }

  return {
    ...resultado,
    permisos: {
      ...resultado.permisos,
      puedeGestionarEvidencias,
      puedeCompletarEvidenciaPendiente,
      motivoEvidencias,
    },
  };
}
