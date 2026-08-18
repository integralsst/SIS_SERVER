import {
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";

export interface OpcionesAlertasGestionesAsignadas {
  empresaId?: string;
  limiteConsulta?: number | null;
}

export interface AlertaGestionAsignada {
  id: string;
  compromisoId: string;
  tipo: "GESTION_ASIGNADA";
  nivel: "MEDIA";
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

const ROLES_HABILITADOS: RolUsuario[] = [
  RolUsuario.PROFESIONAL,
  RolUsuario.COORDINADOR,
];

function nombrePersona(
  persona:
    | {
        nombres: string;
        apellidos: string;
      }
    | null
    | undefined
): string {
  if (!persona) return "Sin líder asignado";

  return [persona.nombres, persona.apellidos]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function describirPermisos(participante: {
  esLider: boolean;
  puedeEvaluar: boolean;
  puedeGestionarEvidencias: boolean;
}): string {
  const permisos: string[] = [];

  if (participante.esLider) permisos.push("liderar y finalizar la gestión");
  if (participante.puedeEvaluar) permisos.push("registrar evaluaciones");
  if (participante.puedeGestionarEvidencias) {
    permisos.push("gestionar evidencias");
  }

  return permisos.length > 0
    ? permisos.join(", ")
    : "consultar la gestión";
}

function rutaGestion(
  empresaId: string,
  anio: number,
  gestionId: string
): string {
  const query = new URLSearchParams({
    anio: String(anio),
    gestionId,
  });

  return `/dashboard/empresas/${empresaId}/evaluacion?${query.toString()}`;
}

function fechaMasReciente(
  actual: Date | undefined,
  candidata: Date
): Date {
  return !actual || candidata > actual ? candidata : actual;
}

export const servicioAlertasGestionesAsignadas = {
  listar: async (
    usuario: UsuarioSesionEvaluacion,
    opciones: OpcionesAlertasGestionesAsignadas = {}
  ): Promise<AlertaGestionAsignada[]> => {
    if (
      !ROLES_HABILITADOS.includes(usuario.rol) ||
      !usuario.profesionalId
    ) {
      return [];
    }

    const participantes = await prisma.gestionParticipante.findMany({
      where: {
        profesionalId: usuario.profesionalId,
        activo: true,
        asignadoPorUsuarioId: {
          not: usuario.usuarioId,
        },
        OR: [
          { esLider: true },
          { puedeEvaluar: true },
          { puedeGestionarEvidencias: true },
        ],
        gestion: {
          estado: EstadoGestionSgsst.BORRADOR,
          valida: true,
          empresaPeriodo: {
            estado: EstadoPeriodoSgsst.ABIERTO,
            ...(opciones.empresaId
              ? { empresaId: opciones.empresaId }
              : {}),
            empresa: {
              activo: true,
            },
          },
        },
      },
      orderBy: {
        fechaInicio: "desc",
      },
      select: {
        id: true,
        gestionId: true,
        esLider: true,
        puedeEvaluar: true,
        puedeGestionarEvidencias: true,
        responsabilidad: true,
        fechaInicio: true,
        asignadoPor: {
          select: {
            id: true,
            nombre: true,
          },
        },
        gestion: {
          select: {
            id: true,
            tipoActividad: true,
            categoriaGestion: {
              select: {
                nombre: true,
              },
            },
            empresaPeriodo: {
              select: {
                anio: true,
                empresa: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
            },
            participantes: {
              where: {
                activo: true,
                esLider: true,
              },
              select: {
                profesional: {
                  select: {
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (participantes.length === 0) {
      return [];
    }

    const gestionesIds = participantes.map(
      (participante) => participante.gestionId
    );
    const actuaciones = await prisma.evaluacionAspecto.findMany({
      where: {
        gestionId: {
          in: gestionesIds,
        },
        OR: [
          {
            usuarioRegistradorId: usuario.usuarioId,
          },
          {
            evidencias: {
              some: {
                usuarioCreadorId: usuario.usuarioId,
              },
            },
          },
        ],
      },
      select: {
        gestionId: true,
        usuarioRegistradorId: true,
        updatedAt: true,
        evidencias: {
          where: {
            usuarioCreadorId: usuario.usuarioId,
          },
          select: {
            createdAt: true,
          },
        },
      },
    });
    const ultimaActuacionPorGestion = new Map<string, Date>();

    for (const actuacion of actuaciones) {
      let fecha = ultimaActuacionPorGestion.get(actuacion.gestionId);

      if (actuacion.usuarioRegistradorId === usuario.usuarioId) {
        fecha = fechaMasReciente(fecha, actuacion.updatedAt);
      }

      for (const evidencia of actuacion.evidencias) {
        fecha = fechaMasReciente(fecha, evidencia.createdAt);
      }

      if (fecha) {
        ultimaActuacionPorGestion.set(actuacion.gestionId, fecha);
      }
    }

    const alertas = participantes
      .filter((participante) => {
        const ultimaActuacion = ultimaActuacionPorGestion.get(
          participante.gestionId
        );

        return (
          !ultimaActuacion ||
          ultimaActuacion < participante.fechaInicio
        );
      })
      .map((participante): AlertaGestionAsignada => {
        const periodo = participante.gestion.empresaPeriodo;
        const lider = nombrePersona(
          participante.gestion.participantes[0]?.profesional
        );
        const responsabilidad =
          participante.responsabilidad?.trim() ||
          "Participación en el equipo de la gestión.";
        const permisos = describirPermisos(participante);
        const categoria =
          participante.gestion.categoriaGestion?.nombre;

        return {
          id: `GESTION_ASIGNADA:${participante.id}`,
          compromisoId: participante.id,
          tipo: "GESTION_ASIGNADA",
          nivel: "MEDIA",
          titulo: "Nueva gestión asignada",
          descripcion: `${periodo.empresa.nombre}: fuiste agregado a “${participante.gestion.tipoActividad}”. Líder: ${lider}. Responsabilidad: ${responsabilidad} Permisos: ${permisos}.${categoria ? ` Categoría: ${categoria}.` : ""}`,
          empresa: periodo.empresa,
          aspecto: {
            id: 0,
            nombre: participante.gestion.tipoActividad,
          },
          fechaLimite: participante.fechaInicio.toISOString(),
          accion: {
            etiqueta: "Abrir gestión",
            ruta: rutaGestion(
              periodo.empresa.id,
              periodo.anio,
              participante.gestion.id
            ),
          },
        };
      });

    if (opciones.limiteConsulta === null) {
      return alertas;
    }

    return alertas.slice(0, opciones.limiteConsulta ?? 100);
  },
};
