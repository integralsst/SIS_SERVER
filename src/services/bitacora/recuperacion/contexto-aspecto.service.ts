import {
  EstadoGestionSgsst,
  EstadoRegistro,
} from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import type { ContextoAspectoBitacora } from "../../../types/bitacora.types";
import { CRITERIO_GENERAL_EVALUACION_BITACORA } from "../criterios-evaluacion.constants";
import type { CandidatoAspectoBitacora } from "./candidatos-aspecto.service";

function construirLogicaDisponible(aspecto: {
  logicaEvaluacion: string | null;
  planAccionEspecifico: { descripcion: string } | null;
  configuracion: {
    permiteNoAplica: boolean;
    esEvergreen: boolean;
    documentoActualizacionPeriodica: boolean;
    tareaEjecucionCotidiana: boolean;
  } | null;
  configuracionVigencia: {
    descripcionRegla: string | null;
  } | null;
  configuracionEvidencia: {
    requiereEvidencia: boolean;
    descripcionEvidencia: string | null;
  } | null;
  configuracionRevision: {
    requiereRevisionTecnica: boolean;
    observaciones: string | null;
  } | null;
}): string {
  const reglas: string[] = [CRITERIO_GENERAL_EVALUACION_BITACORA];

  if (aspecto.logicaEvaluacion?.trim()) {
    reglas.push(
      `LÓGICA ESPECÍFICA OFICIAL DEL ASPECTO:\n${aspecto.logicaEvaluacion.trim()}`
    );
  } else {
    reglas.push(
      "LÓGICA ESPECÍFICA: no se encuentra diligenciada para este aspecto en la versión de la Supermatriz. Aplica el criterio general 0/3/5 exclusivamente sobre evidencia directa del mismo aspecto y utiliza INFORMACION_INSUFICIENTE solo cuando esa evidencia no permita concluir con seguridad."
    );
  }

  if (aspecto.planAccionEspecifico?.descripcion?.trim()) {
    reglas.push(
      `Plan de acción específico: ${aspecto.planAccionEspecifico.descripcion.trim()}`
    );
  }

  if (aspecto.configuracionVigencia?.descripcionRegla?.trim()) {
    reglas.push(
      `Regla de vigencia: ${aspecto.configuracionVigencia.descripcionRegla.trim()}`
    );
  }

  if (aspecto.configuracionEvidencia?.requiereEvidencia) {
    reglas.push(
      aspecto.configuracionEvidencia.descripcionEvidencia?.trim()
        ? `Evidencia requerida: ${aspecto.configuracionEvidencia.descripcionEvidencia.trim()}`
        : "El aspecto requiere evidencia documental configurada en Stack44."
    );
  }

  if (aspecto.configuracionRevision?.requiereRevisionTecnica) {
    reglas.push(
      aspecto.configuracionRevision.observaciones?.trim()
        ? `Revisión técnica obligatoria: ${aspecto.configuracionRevision.observaciones.trim()}`
        : "El aspecto requiere revisión técnica obligatoria."
    );
  }

  if (aspecto.configuracion) {
    reglas.push(
      `Permite No Aplica: ${aspecto.configuracion.permiteNoAplica ? "sí" : "no"}.`
    );

    if (aspecto.configuracion.esEvergreen) {
      reglas.push("Aspecto configurado como Evergreen.");
    }

    if (aspecto.configuracion.documentoActualizacionPeriodica) {
      reglas.push("Tiene actualización documental periódica configurada.");
    }

    if (aspecto.configuracion.tareaEjecucionCotidiana) {
      reglas.push("Tiene ejecución cotidiana configurada.");
    }
  }

  return reglas.join("\n\n");
}

export async function cargarContextoAspectosBitacora(params: {
  empresaId: string;
  versionSupermatrizId: number;
  fechaEfectiva: Date;
  candidatos: CandidatoAspectoBitacora[];
}): Promise<ContextoAspectoBitacora[]> {
  if (params.candidatos.length === 0) {
    return [];
  }

  const ids = params.candidatos.map((candidato) => candidato.aspectoId);

  const aspectos = await prisma.aspecto.findMany({
    where: {
      id: { in: ids },
      versionSupermatrizId: params.versionSupermatrizId,
      estado: EstadoRegistro.ACTIVO,
    },
    select: {
      id: true,
      identidadHistorica: true,
      codigo: true,
      nombre: true,
      descripcion: true,
      logicaEvaluacion: true,
      planAccionEspecifico: {
        select: { descripcion: true },
      },
      configuracion: {
        select: {
          permiteNoAplica: true,
          esEvergreen: true,
          documentoActualizacionPeriodica: true,
          tareaEjecucionCotidiana: true,
        },
      },
      configuracionVigencia: {
        select: { descripcionRegla: true },
      },
      configuracionEvidencia: {
        select: {
          requiereEvidencia: true,
          descripcionEvidencia: true,
        },
      },
      configuracionRevision: {
        select: {
          requiereRevisionTecnica: true,
          observaciones: true,
        },
      },
      palabrasClave: {
        select: {
          palabraClave: { select: { nombre: true } },
        },
      },
      requisitosNormativos: {
        select: {
          requisitoNormativo: {
            select: {
              clave: true,
              norma: true,
              articulo: true,
              descripcion: true,
            },
          },
        },
      },
    },
  });

  const porId = new Map(aspectos.map((aspecto) => [aspecto.id, aspecto]));

  return Promise.all(
    params.candidatos.map(async (candidato) => {
      const aspecto = porId.get(candidato.aspectoId);

      if (!aspecto) {
        throw new Error(
          `El aspecto candidato ${candidato.aspectoId} dejó de estar disponible en la versión aplicable.`
        );
      }

      const evaluacionActual = await prisma.evaluacionAspecto.findFirst({
        where: {
          aspecto: {
            identidadHistorica: aspecto.identidadHistorica,
          },
          gestion: {
            empresaPeriodo: {
              empresaId: params.empresaId,
            },
            estado: EstadoGestionSgsst.FINALIZADA,
            valida: true,
            fechaGestion: {
              lte: params.fechaEfectiva,
            },
          },
        },
        orderBy: [
          { gestion: { fechaGestion: "desc" } },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: {
          estadoCumplimiento: true,
          calificacionAdministrativa: true,
          observacion: true,
          fechaDocumento: true,
        },
      });

      const palabrasClave = aspecto.palabrasClave.map(
        (relacion) => relacion.palabraClave.nombre
      );
      const requisitosNormativos = aspecto.requisitosNormativos.map(
        (relacion) => {
          const requisito = relacion.requisitoNormativo;
          return [
            requisito.clave,
            requisito.norma,
            requisito.articulo,
            requisito.descripcion,
          ]
            .filter(Boolean)
            .join(" · ");
        }
      );

      return {
        aspectoId: aspecto.id,
        identidadHistorica: aspecto.identidadHistorica,
        codigo: aspecto.codigo,
        nombre: aspecto.nombre,
        descripcion: aspecto.descripcion,
        planAccionEspecifico:
          aspecto.planAccionEspecifico?.descripcion ?? null,
        palabrasClave,
        requisitosNormativos,
        estadoActual: evaluacionActual?.estadoCumplimiento ?? null,
        calificacionActual: evaluacionActual
          ? Number(evaluacionActual.calificacionAdministrativa)
          : null,
        observacionActual: evaluacionActual?.observacion ?? null,
        fechaDocumentoActual:
          evaluacionActual?.fechaDocumento?.toISOString().slice(0, 10) ?? null,
        requiereEvidencia:
          aspecto.configuracionEvidencia?.requiereEvidencia ?? false,
        descripcionEvidencia:
          aspecto.configuracionEvidencia?.descripcionEvidencia ?? null,
        requiereRevisionTecnica:
          aspecto.configuracionRevision?.requiereRevisionTecnica ?? false,
        logicaEvaluacion: construirLogicaDisponible(aspecto),
      } satisfies ContextoAspectoBitacora;
    })
  );
}
