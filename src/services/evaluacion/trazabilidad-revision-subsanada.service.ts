import {
  EstadoGestionSgsst,
  EstadoRevisionTecnica,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

interface EventoTrazabilidadBase {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  estado: string | null;
  createdAt: string;
  usuario: {
    id: string;
    nombre: string;
  } | null;
  referencia: {
    evaluacionId: string | null;
    revisionTecnicaId: string | null;
    compromisoId: string | null;
    auditoriaId?: string | null;
    hallazgoId?: string | null;
  };
}

function etiquetaEstadoCumplimiento(estado: string): string {
  const etiquetas: Record<string, string> = {
    CUMPLIDO: "Cumplido",
    PARCIAL: "Parcial",
    NO_CUMPLIDO: "No cumplido",
    NO_APLICA: "No aplica",
  };

  return etiquetas[estado] ?? estado.replaceAll("_", " ");
}

export async function enriquecerTrazabilidadConSubsanacionesRevision<
  T extends { trazabilidad: EventoTrazabilidadBase[] },
>(resultado: T): Promise<T> {
  const revisionIds = [
    ...new Set(
      resultado.trazabilidad
        .filter(
          (evento) =>
            evento.tipo === "REVISION_TECNICA" &&
            evento.estado === EstadoRevisionTecnica.REQUIERE_AJUSTES &&
            Boolean(evento.referencia.revisionTecnicaId)
        )
        .map((evento) => evento.referencia.revisionTecnicaId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (revisionIds.length === 0) {
    return resultado;
  }

  const revisiones =
    await prisma.revisionTecnicaEvaluacion.findMany({
      where: {
        id: {
          in: revisionIds,
        },
        estado: EstadoRevisionTecnica.REQUIERE_AJUSTES,
      },
      select: {
        id: true,
        revisadaEn: true,
        evaluacion: {
          select: {
            id: true,
            estadoCumplimiento: true,
            calificacionAdministrativa: true,
            aspecto: {
              select: {
                identidadHistorica: true,
              },
            },
            gestion: {
              select: {
                empresaPeriodoId: true,
              },
            },
          },
        },
      },
    });

  const identidades = [
    ...new Set(
      revisiones.map(
        (revision) => revision.evaluacion.aspecto.identidadHistorica
      )
    ),
  ];
  const periodoIds = [
    ...new Set(
      revisiones.map(
        (revision) => revision.evaluacion.gestion.empresaPeriodoId
      )
    ),
  ];

  if (identidades.length === 0 || periodoIds.length === 0) {
    return resultado;
  }

  const evaluacionesPosteriores = await prisma.evaluacionAspecto.findMany({
    where: {
      aspecto: {
        identidadHistorica: {
          in: identidades,
        },
      },
      gestion: {
        empresaPeriodoId: {
          in: periodoIds,
        },
        valida: true,
        estado: EstadoGestionSgsst.FINALIZADA,
      },
    },
    orderBy: [
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
    select: {
      id: true,
      createdAt: true,
      estadoCumplimiento: true,
      calificacionAdministrativa: true,
      aspecto: {
        select: {
          identidadHistorica: true,
        },
      },
      gestion: {
        select: {
          empresaPeriodoId: true,
          finalizadaEn: true,
        },
      },
      usuarioRegistrador: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  const idsExistentes = new Set(
    resultado.trazabilidad.map((evento) => evento.id)
  );
  const eventosSubsanacion: EventoTrazabilidadBase[] = [];

  for (const revision of revisiones) {
    if (!revision.revisadaEn) continue;

    const revisadaEn = revision.revisadaEn;
    const identidadHistorica =
      revision.evaluacion.aspecto.identidadHistorica;
    const empresaPeriodoId =
      revision.evaluacion.gestion.empresaPeriodoId;

    const correctiva = evaluacionesPosteriores.find(
      (evaluacion) =>
        evaluacion.id !== revision.evaluacion.id &&
        evaluacion.aspecto.identidadHistorica === identidadHistorica &&
        evaluacion.gestion.empresaPeriodoId === empresaPeriodoId &&
        evaluacion.createdAt.getTime() > revisadaEn.getTime()
    );

    if (!correctiva) continue;

    const eventoId = `REVISION_TECNICA_SUBSANADA:${revision.id}`;
    if (idsExistentes.has(eventoId)) continue;

    const estadoAnterior = etiquetaEstadoCumplimiento(
      revision.evaluacion.estadoCumplimiento
    );
    const notaAnterior =
      revision.evaluacion.calificacionAdministrativa.toNumber();
    const estadoCorrectivo = etiquetaEstadoCumplimiento(
      correctiva.estadoCumplimiento
    );
    const notaCorrectiva =
      correctiva.calificacionAdministrativa.toNumber();

    eventosSubsanacion.push({
      id: eventoId,
      tipo: "REVISION_TECNICA",
      titulo: "Revisión técnica subsanada",
      descripcion: `La corrección quedó registrada mediante una nueva evaluación directa. Resultado anterior: ${estadoAnterior} · ${notaAnterior}. Resultado correctivo: ${estadoCorrectivo} · ${notaCorrectiva}.`,
      estado: "SUBSANADA",
      createdAt: (
        correctiva.gestion.finalizadaEn ?? correctiva.createdAt
      ).toISOString(),
      usuario: correctiva.usuarioRegistrador,
      referencia: {
        evaluacionId: correctiva.id,
        revisionTecnicaId: revision.id,
        compromisoId: null,
      },
    });
  }

  if (eventosSubsanacion.length === 0) {
    return resultado;
  }

  return {
    ...resultado,
    trazabilidad: [
      ...resultado.trazabilidad,
      ...eventosSubsanacion,
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
