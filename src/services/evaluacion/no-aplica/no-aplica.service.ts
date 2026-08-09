import {
  EstadoDecisionNoAplica,
  EstadoGestionSgsst,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import type { DecidirNoAplicaInput } from "../../../types/evaluacion/no-aplica.types";
import type { UsuarioSesionEvaluacion } from "../../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../../utils/evaluacion";
import {
  asegurarAccesoEmpresa,
  asegurarAccesoPeriodo,
} from "../acceso-evaluacion.service";

function serializarDecision(
  decision: Awaited<
    ReturnType<typeof obtenerDecisionCompleta>
  >
) {
  if (!decision) return null;

  return {
    id: decision.id,
    estado: decision.estado,
    resultadoEfectivo:
      decision.resultadoEfectivo.toNumber(),
    observacionDecision: decision.observacionDecision,
    solicitadaEn: decision.solicitadaEn.toISOString(),
    decididaEn:
      decision.decididaEn?.toISOString() ?? null,
    solicitadaPor: decision.solicitadaPor,
    decididaPor: decision.decididaPor,
    evaluacion: {
      id: decision.evaluacion.id,
      justificacionNoAplica:
        decision.evaluacion.justificacionNoAplica,
      observacion: decision.evaluacion.observacion,
      creadaEn:
        decision.evaluacion.createdAt.toISOString(),
      aspecto: decision.evaluacion.aspecto,
      gestion: {
        id: decision.evaluacion.gestion.id,
        fechaGestion:
          decision.evaluacion.gestion.fechaGestion.toISOString(),
        modalidad:
          decision.evaluacion.gestion.modalidad,
        tipoActividad:
          decision.evaluacion.gestion.tipoActividad,
        profesional:
          decision.evaluacion.gestion.profesional
            ? `${decision.evaluacion.gestion.profesional.nombres} ${decision.evaluacion.gestion.profesional.apellidos}`.trim()
            : null,
      },
      evidencias: decision.evaluacion.evidencias.map(
        (evidencia) => ({
          id: evidencia.id,
          nombre: evidencia.nombre,
          url: evidencia.url,
          descripcion: evidencia.descripcion,
          fechaDocumento:
            evidencia.fechaDocumento?.toISOString() ?? null,
          visibleCliente: evidencia.visibleCliente,
        })
      ),
    },
  };
}

async function obtenerDecisionCompleta(id: string) {
  return prisma.decisionNoAplica.findUnique({
    where: {
      id,
    },
    include: {
      solicitadaPor: {
        select: {
          id: true,
          nombre: true,
          correo: true,
        },
      },
      decididaPor: {
        select: {
          id: true,
          nombre: true,
          correo: true,
        },
      },
      evaluacion: {
        include: {
          aspecto: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              estandar: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                },
              },
            },
          },
          gestion: {
            include: {
              profesional: {
                select: {
                  id: true,
                  nombres: true,
                  apellidos: true,
                },
              },
              empresaPeriodo: {
                select: {
                  empresaId: true,
                  anio: true,
                },
              },
            },
          },
          evidencias: {
            where: {
              activo: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });
}

export const servicioNoAplica = {
  listarPeriodo: async (
    periodoId: string,
    usuario: UsuarioSesionEvaluacion
  ) => {
    const periodo = await asegurarAccesoPeriodo(
      usuario,
      periodoId,
      "LECTURA"
    );

    const decisiones = await prisma.decisionNoAplica.findMany({
      where: {
        evaluacion: {
          gestion: {
            empresaPeriodoId: periodoId,
            estado: EstadoGestionSgsst.FINALIZADA,
            valida: true,
          },
        },
      },
      orderBy: {
        solicitadaEn: "desc",
      },
      include: {
        solicitadaPor: {
          select: {
            id: true,
            nombre: true,
            correo: true,
          },
        },
        decididaPor: {
          select: {
            id: true,
            nombre: true,
            correo: true,
          },
        },
        evaluacion: {
          include: {
            aspecto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                estandar: {
                  select: {
                    id: true,
                    codigo: true,
                    nombre: true,
                  },
                },
              },
            },
            gestion: {
              include: {
                profesional: {
                  select: {
                    id: true,
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
            },
            evidencias: {
              where: {
                activo: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    const items = decisiones.map((decision) => ({
      id: decision.id,
      estado: decision.estado,
      resultadoEfectivo:
        decision.resultadoEfectivo.toNumber(),
      observacionDecision: decision.observacionDecision,
      solicitadaEn: decision.solicitadaEn.toISOString(),
      decididaEn:
        decision.decididaEn?.toISOString() ?? null,
      solicitadaPor: decision.solicitadaPor,
      decididaPor: decision.decididaPor,
      puedeDecidir:
        usuario.rol === RolUsuario.COORDINADOR &&
        decision.estado ===
          EstadoDecisionNoAplica.PENDIENTE &&
        decision.solicitadaPorUsuarioId !==
          usuario.usuarioId,
      evaluacion: {
        id: decision.evaluacion.id,
        justificacionNoAplica:
          decision.evaluacion.justificacionNoAplica,
        observacion: decision.evaluacion.observacion,
        creadaEn:
          decision.evaluacion.createdAt.toISOString(),
        aspecto: decision.evaluacion.aspecto,
        gestion: {
          id: decision.evaluacion.gestion.id,
          fechaGestion:
            decision.evaluacion.gestion.fechaGestion.toISOString(),
          modalidad:
            decision.evaluacion.gestion.modalidad,
          tipoActividad:
            decision.evaluacion.gestion.tipoActividad,
          profesional:
            decision.evaluacion.gestion.profesional
              ? `${decision.evaluacion.gestion.profesional.nombres} ${decision.evaluacion.gestion.profesional.apellidos}`.trim()
              : null,
        },
        evidencias: decision.evaluacion.evidencias.map(
          (evidencia) => ({
            id: evidencia.id,
            nombre: evidencia.nombre,
            url: evidencia.url,
            descripcion: evidencia.descripcion,
            fechaDocumento:
              evidencia.fechaDocumento?.toISOString() ?? null,
            visibleCliente: evidencia.visibleCliente,
          })
        ),
      },
    }));

    return {
      periodo: {
        id: periodo.id,
        anio: periodo.anio,
        empresa: periodo.empresa,
      },
      resumen: {
        total: items.length,
        pendientes: items.filter(
          (item) =>
            item.estado === EstadoDecisionNoAplica.PENDIENTE
        ).length,
        aprobados: items.filter(
          (item) =>
            item.estado === EstadoDecisionNoAplica.APROBADO
        ).length,
        rechazados: items.filter(
          (item) =>
            item.estado === EstadoDecisionNoAplica.RECHAZADO
        ).length,
      },
      items,
    };
  },

  decidir: async (
    decisionId: string,
    input: DecidirNoAplicaInput,
    usuario: UsuarioSesionEvaluacion
  ) => {
    if (usuario.rol !== RolUsuario.COORDINADOR) {
      throw new ErrorEvaluacion(
        "Solo un coordinador puede decidir solicitudes de No aplica.",
        403,
        "DECISION_NO_APLICA_REQUIERE_COORDINADOR"
      );
    }

    const actual = await obtenerDecisionCompleta(decisionId);

    if (!actual) {
      throw new ErrorEvaluacion(
        "La solicitud de No aplica no existe.",
        404,
        "DECISION_NO_APLICA_NO_ENCONTRADA"
      );
    }

    await asegurarAccesoEmpresa(
      usuario,
      actual.evaluacion.gestion.empresaPeriodo.empresaId,
      "ESCRITURA"
    );

    if (
      actual.evaluacion.gestion.estado !==
        EstadoGestionSgsst.FINALIZADA ||
      !actual.evaluacion.gestion.valida
    ) {
      throw new ErrorEvaluacion(
        "La evaluación ya no pertenece a una gestión finalizada y válida.",
        409,
        "NO_APLICA_GESTION_NO_VALIDA"
      );
    }

    if (
      actual.estado !== EstadoDecisionNoAplica.PENDIENTE
    ) {
      throw new ErrorEvaluacion(
        "La solicitud de No aplica ya fue decidida.",
        409,
        "NO_APLICA_YA_DECIDIDO"
      );
    }

    if (
      actual.solicitadaPorUsuarioId === usuario.usuarioId ||
      actual.evaluacion.usuarioRegistradorId ===
        usuario.usuarioId
    ) {
      throw new ErrorEvaluacion(
        "No puedes decidir una solicitud de No aplica que hayas originado.",
        403,
        "NO_APLICA_SIN_SEPARACION_FUNCIONES"
      );
    }

    const aprobada = input.decision === "APROBAR";
    const ahora = new Date();

    await prisma.$transaction(async (tx) => {
      const reclamada = await tx.decisionNoAplica.updateMany({
        where: {
          id: decisionId,
          estado: EstadoDecisionNoAplica.PENDIENTE,
        },
        data: {
          estado: aprobada
            ? EstadoDecisionNoAplica.APROBADO
            : EstadoDecisionNoAplica.RECHAZADO,
          resultadoEfectivo: aprobada ? 5 : 0,
          observacionDecision:
            input.observacion?.trim() || null,
          decididaPorUsuarioId: usuario.usuarioId,
          decididaEn: ahora,
        },
      });

      if (reclamada.count !== 1) {
        throw new ErrorEvaluacion(
          "La solicitud de No aplica fue decidida por otro usuario.",
          409,
          "NO_APLICA_DECISION_CONCURRENTE"
        );
      }

      await tx.historialEvaluacion.create({
        data: {
          gestionId: actual.evaluacion.gestion.id,
          evaluacionId: actual.evaluacion.id,
          usuarioId: usuario.usuarioId,
          accion: aprobada
            ? "APROBAR_NO_APLICA"
            : "RECHAZAR_NO_APLICA",
          descripcion: aprobada
            ? "El coordinador aprobó la solicitud de No aplica. El resultado efectivo pasa a 5."
            : "El coordinador rechazó la solicitud de No aplica. El resultado efectivo pasa a 0 y se requiere una nueva evaluación.",
          datosAntes: {
            estado: actual.estado,
            resultadoEfectivo:
              actual.resultadoEfectivo.toNumber(),
          },
          datosDespues: {
            estado: aprobada ? "APROBADO" : "RECHAZADO",
            resultadoEfectivo: aprobada ? 5 : 0,
            observacion: input.observacion?.trim() || null,
          },
        },
      });
    });

    return serializarDecision(
      await obtenerDecisionCompleta(decisionId)
    );
  },
};
