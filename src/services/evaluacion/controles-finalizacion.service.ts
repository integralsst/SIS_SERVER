import {
  EstadoCumplimientoAspecto,
  EstadoRegistro,
  Prisma,
  RolUsuario,
} from "@prisma/client";

import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";

interface GestionParaControles {
  id: string;
  fechaGestion: Date;
  modalidad: string;
  tipoActividad: string;
}

interface EvaluacionParaControles {
  id: string;
  aspectoId: number;
  usuarioRegistradorId: string;
  estadoCumplimiento: EstadoCumplimientoAspecto;
  aspecto: {
    nombre: string;
  };
}

function textoComparable(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("es") ?? "";
}

function reglaCoincide(
  regla: {
    aspectoId: number | null;
    modalidad: string | null;
    tipoActividad: string | null;
  },
  evaluacion: EvaluacionParaControles,
  gestion: GestionParaControles
): boolean {
  if (
    regla.aspectoId !== null &&
    regla.aspectoId !== evaluacion.aspectoId
  ) {
    return false;
  }

  if (
    regla.modalidad !== null &&
    regla.modalidad !== gestion.modalidad
  ) {
    return false;
  }

  if (
    regla.tipoActividad &&
    textoComparable(regla.tipoActividad) !==
      textoComparable(gestion.tipoActividad)
  ) {
    return false;
  }

  return true;
}

export async function registrarControlesFinalizacion(
  tx: Prisma.TransactionClient,
  gestion: GestionParaControles,
  evaluaciones: EvaluacionParaControles[],
  usuario: UsuarioSesionEvaluacion
) {
  const noAplica = evaluaciones.filter(
    (evaluacion) =>
      evaluacion.estadoCumplimiento ===
      EstadoCumplimientoAspecto.NO_APLICA
  );

  if (noAplica.length > 0) {
    const solicitantes = await tx.usuario.findMany({
      where: {
        id: {
          in: [
            ...new Set(
              noAplica.map(
                (evaluacion) =>
                  evaluacion.usuarioRegistradorId
              )
            ),
          ],
        },
      },
      select: {
        id: true,
        rol: true,
      },
    });
    const rolesPorUsuario = new Map(
      solicitantes.map((item) => [item.id, item.rol])
    );

    for (const evaluacion of noAplica) {
      if (
        rolesPorUsuario.get(
          evaluacion.usuarioRegistradorId
        ) !== RolUsuario.PROFESIONAL
      ) {
        throw new ErrorEvaluacion(
          `El No aplica del aspecto "${evaluacion.aspecto.nombre}" debe ser propuesto por un profesional.`,
          403,
          "NO_APLICA_REQUIERE_PROFESIONAL"
        );
      }

      const decision = await tx.decisionNoAplica.create({
        data: {
          evaluacionId: evaluacion.id,
          solicitadaPorUsuarioId:
            evaluacion.usuarioRegistradorId,
          resultadoEfectivo: 3,
        },
      });

      await tx.historialEvaluacion.create({
        data: {
          gestionId: gestion.id,
          evaluacionId: evaluacion.id,
          usuarioId:
            evaluacion.usuarioRegistradorId,
          accion: "SOLICITAR_NO_APLICA",
          descripcion: `Se presentó la solicitud de No aplica para el aspecto ${evaluacion.aspecto.nombre}. Mientras se decide, el resultado efectivo es 3.`,
          datosDespues: {
            decisionNoAplicaId: decision.id,
            estado: decision.estado,
            resultadoEfectivo: 3,
          },
        },
      });
    }
  }

  if (evaluaciones.length === 0) {
    return;
  }

  const aspectoIds = [
    ...new Set(
      evaluaciones.map((evaluacion) => evaluacion.aspectoId)
    ),
  ];

  const reglas = await tx.reglaAprobacionGestion.findMany({
    where: {
      estado: EstadoRegistro.ACTIVO,
      requiereAprobacion: true,
      OR: [
        {
          aspectoId: {
            in: aspectoIds,
          },
        },
        {
          aspectoId: null,
        },
      ],
      AND: [
        {
          OR: [
            {
              vigenteDesde: null,
            },
            {
              vigenteDesde: {
                lte: gestion.fechaGestion,
              },
            },
          ],
        },
        {
          OR: [
            {
              vigenteHasta: null,
            },
            {
              vigenteHasta: {
                gte: gestion.fechaGestion,
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      aspectoId: true,
      modalidad: true,
      tipoActividad: true,
      criterio: true,
    },
  });

  const reglasPorEvaluacion = evaluaciones
    .map((evaluacion) => ({
      evaluacion,
      reglas: reglas.filter((regla) =>
        reglaCoincide(regla, evaluacion, gestion)
      ),
    }))
    .filter((item) => item.reglas.length > 0);

  if (reglasPorEvaluacion.length === 0) {
    return;
  }

  const reglasAplicadas = [
    ...new Map(
      reglasPorEvaluacion
        .flatMap((item) => item.reglas)
        .map((regla) => [regla.id, regla])
    ).values(),
  ];

  const aprobacion = await tx.aprobacionGestion.create({
    data: {
      gestionId: gestion.id,
      reglasAplicadas: reglasAplicadas.map((regla) => ({
        id: regla.id,
        aspectoId: regla.aspectoId,
        modalidad: regla.modalidad,
        tipoActividad: regla.tipoActividad,
        criterio: regla.criterio,
      })),
      evaluaciones: {
        create: reglasPorEvaluacion.map((item) => ({
          evaluacionId: item.evaluacion.id,
        })),
      },
    },
  });

  await tx.historialEvaluacion.create({
    data: {
      gestionId: gestion.id,
      usuarioId: usuario.usuarioId,
      accion: "REQUERIR_APROBACION_GESTION",
      descripcion: `La gestión quedó pendiente de aprobación administrativa para ${reglasPorEvaluacion.length} evaluación(es) configurada(s).`,
      datosDespues: {
        aprobacionGestionId: aprobacion.id,
        evaluacionIds: reglasPorEvaluacion.map(
          (item) => item.evaluacion.id
        ),
        reglasAplicadas: reglasAplicadas.map(
          (regla) => regla.id
        ),
      },
    },
  });
}
