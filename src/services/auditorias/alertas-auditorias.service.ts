import {
  EstadoAuditoriaSgsst,
  EstadoHallazgoAuditoria,
  EstadoRecomendacionAuditoria,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { construirFiltroEmpresasAccesibles } from "../empresas/acceso-empresas.service";

export type NivelAlertaAuditoria = "ALTA" | "MEDIA" | "BAJA";

export interface AlertaAuditoria {
  id: string;
  compromisoId: string;
  tipo: string;
  nivel: NivelAlertaAuditoria;
  titulo: string;
  descripcion: string;
  empresa: {
    id: string;
    nombre: string;
  };
  aspecto: {
    id: number;
    nombre: string;
  };
  fechaLimite: string;
  accion: {
    etiqueta: string;
    ruta: string;
  };
}

interface OpcionesAlertasAuditoria {
  empresaId?: string;
  limiteConsulta?: number | null;
}

const ROLES_SUPERVISION = new Set<RolUsuario>([
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
]);

function nivelFecha(fecha: Date | null, ahora: Date): NivelAlertaAuditoria {
  if (!fecha) return "MEDIA";
  if (fecha.getTime() < ahora.getTime()) return "ALTA";
  const dias = (fecha.getTime() - ahora.getTime()) / 86_400_000;
  return dias <= 7 ? "MEDIA" : "BAJA";
}

function fechaReferencia(fecha: Date | null, fallback: Date): string {
  return (fecha ?? fallback).toISOString();
}

export const servicioAlertasAuditorias = {
  listar: async (
    usuario: UsuarioSesionEvaluacion,
    opciones: OpcionesAlertasAuditoria = {}
  ): Promise<AlertaAuditoria[]> => {
    const ahora = new Date();
    const filtroEmpresa = construirFiltroEmpresasAccesibles(usuario);
    const take = opciones.limiteConsulta === null
      ? undefined
      : opciones.limiteConsulta ?? 100;

    const empresaPeriodoWhere = {
      ...(opciones.empresaId ? { empresaId: opciones.empresaId } : {}),
      empresa: { is: filtroEmpresa },
    };

    const [recomendaciones, hallazgosResponsables, hallazgosSinResponsable] =
      await Promise.all([
        prisma.recomendacionAuditoria.findMany({
          where: {
            responsableUsuarioId: usuario.usuarioId,
            estado: {
              in: [
                EstadoRecomendacionAuditoria.PENDIENTE,
                EstadoRecomendacionAuditoria.EN_PROGRESO,
              ],
            },
            hallazgo: {
              is: {
                estado: {
                  in: [
                    EstadoHallazgoAuditoria.ABIERTO,
                    EstadoHallazgoAuditoria.EN_GESTION,
                  ],
                },
                auditoria: {
                  is: {
                    estado: { not: EstadoAuditoriaSgsst.CANCELADA },
                    empresaPeriodo: { is: empresaPeriodoWhere },
                  },
                },
              },
            },
          },
          take,
          orderBy: [{ fechaObjetivo: "asc" }, { createdAt: "asc" }],
          include: {
            hallazgo: {
              include: {
                aspecto: { select: { id: true, nombre: true } },
                auditoria: {
                  include: {
                    empresaPeriodo: {
                      include: {
                        empresa: { select: { id: true, nombre: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.hallazgoAuditoria.findMany({
          where: {
            responsableUsuarioId: usuario.usuarioId,
            estado: {
              in: [
                EstadoHallazgoAuditoria.ABIERTO,
                EstadoHallazgoAuditoria.EN_GESTION,
              ],
            },
            recomendaciones: {
              none: {
                responsableUsuarioId: usuario.usuarioId,
                estado: {
                  in: [
                    EstadoRecomendacionAuditoria.PENDIENTE,
                    EstadoRecomendacionAuditoria.EN_PROGRESO,
                  ],
                },
              },
            },
            auditoria: {
              is: {
                estado: { not: EstadoAuditoriaSgsst.CANCELADA },
                empresaPeriodo: { is: empresaPeriodoWhere },
              },
            },
          },
          take,
          orderBy: [{ fechaObjetivo: "asc" }, { createdAt: "asc" }],
          include: {
            aspecto: { select: { id: true, nombre: true } },
            auditoria: {
              include: {
                empresaPeriodo: {
                  include: {
                    empresa: { select: { id: true, nombre: true } },
                  },
                },
              },
            },
          },
        }),
        ROLES_SUPERVISION.has(usuario.rol)
          ? prisma.hallazgoAuditoria.findMany({
              where: {
                responsableUsuarioId: null,
                estado: {
                  in: [
                    EstadoHallazgoAuditoria.ABIERTO,
                    EstadoHallazgoAuditoria.EN_GESTION,
                  ],
                },
                auditoria: {
                  is: {
                    estado: { not: EstadoAuditoriaSgsst.CANCELADA },
                    empresaPeriodo: { is: empresaPeriodoWhere },
                  },
                },
              },
              take,
              orderBy: [{ fechaObjetivo: "asc" }, { createdAt: "asc" }],
              include: {
                aspecto: { select: { id: true, nombre: true } },
                auditoria: {
                  include: {
                    empresaPeriodo: {
                      include: {
                        empresa: { select: { id: true, nombre: true } },
                      },
                    },
                  },
                },
              },
            })
          : Promise.resolve([]),
      ]);

    const alertas: AlertaAuditoria[] = [];

    for (const recomendacion of recomendaciones) {
      const hallazgo = recomendacion.hallazgo;
      const empresa = hallazgo.auditoria.empresaPeriodo.empresa;
      alertas.push({
        id: `AUDITORIA_RECOMENDACION:${recomendacion.id}`,
        compromisoId: recomendacion.id,
        tipo: "AUDITORIA_RECOMENDACION",
        nivel: nivelFecha(recomendacion.fechaObjetivo, ahora),
        titulo: "Recomendación de auditoría pendiente",
        descripcion: recomendacion.descripcion,
        empresa,
        aspecto: hallazgo.aspecto ?? {
          id: 0,
          nombre: "Hallazgo general de auditoría",
        },
        fechaLimite: fechaReferencia(
          recomendacion.fechaObjetivo,
          recomendacion.createdAt
        ),
        accion: {
          etiqueta: "Gestionar recomendación",
          ruta: `/dashboard/auditorias/${hallazgo.auditoriaId}?hallazgoId=${hallazgo.id}`,
        },
      });
    }

    for (const hallazgo of hallazgosResponsables) {
      const empresa = hallazgo.auditoria.empresaPeriodo.empresa;
      alertas.push({
        id: `AUDITORIA_HALLAZGO:${hallazgo.id}`,
        compromisoId: hallazgo.id,
        tipo: "AUDITORIA_HALLAZGO",
        nivel: nivelFecha(hallazgo.fechaObjetivo, ahora),
        titulo: "Hallazgo de auditoría pendiente",
        descripcion: hallazgo.titulo,
        empresa,
        aspecto: hallazgo.aspecto ?? {
          id: 0,
          nombre: "Hallazgo general de auditoría",
        },
        fechaLimite: fechaReferencia(hallazgo.fechaObjetivo, hallazgo.createdAt),
        accion: {
          etiqueta: "Gestionar hallazgo",
          ruta: `/dashboard/auditorias/${hallazgo.auditoriaId}?hallazgoId=${hallazgo.id}`,
        },
      });
    }

    for (const hallazgo of hallazgosSinResponsable) {
      const empresa = hallazgo.auditoria.empresaPeriodo.empresa;
      alertas.push({
        id: `AUDITORIA_SIN_RESPONSABLE:${hallazgo.id}`,
        compromisoId: hallazgo.id,
        tipo: "AUDITORIA_SIN_RESPONSABLE",
        nivel: "MEDIA",
        titulo: "Hallazgo de auditoría sin responsable",
        descripcion: hallazgo.titulo,
        empresa,
        aspecto: hallazgo.aspecto ?? {
          id: 0,
          nombre: "Hallazgo general de auditoría",
        },
        fechaLimite: fechaReferencia(hallazgo.fechaObjetivo, hallazgo.createdAt),
        accion: {
          etiqueta: "Asignar responsable",
          ruta: `/dashboard/auditorias/${hallazgo.auditoriaId}?hallazgoId=${hallazgo.id}`,
        },
      });
    }

    return alertas;
  },
};
