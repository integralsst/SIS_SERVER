import {
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  EstadoRegistro,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import type { AlertaControlEvaluacion } from "./alertas-control-evaluacion.service";
import { resolverEstadoEvidenciaAspecto } from "./estado-evidencia-aspecto.service";
import {
  construirCorteAnual,
  servicioPeriodosEvaluacion,
} from "./periodos-evaluacion.service";

export interface OpcionesAlertasEvidenciasPendientes {
  empresaId?: string;
  limiteConsulta?: number | null;
}

const ROLES_HABILITADOS: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
];

const ROLES_PARTICIPANTES = new Set<RolUsuario>([
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
]);

function rutaEvidenciaPendiente(
  empresaId: string,
  anio: number,
  tareaId: number
): string {
  const query = new URLSearchParams({
    anio: String(anio),
    tareaId: String(tareaId),
    detalle: "EVIDENCIAS",
  });

  return `/dashboard/empresas/${empresaId}/evaluacion?${query.toString()}`;
}

export const servicioAlertasEvidenciasPendientes = {
  listar: async (
    usuario: UsuarioSesionEvaluacion,
    opciones: OpcionesAlertasEvidenciasPendientes = {}
  ): Promise<AlertaControlEvaluacion[]> => {
    if (!ROLES_HABILITADOS.includes(usuario.rol)) {
      return [];
    }

    const restringirPorParticipacion =
      ROLES_PARTICIPANTES.has(usuario.rol);

    if (restringirPorParticipacion && !usuario.profesionalId) {
      return [];
    }

    const evaluaciones = await prisma.evaluacionAspecto.findMany({
      where: {
        aspecto: {
          configuracionEvidencia: {
            requiereEvidencia: true,
          },
        },
        gestion: {
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          ...(restringirPorParticipacion
            ? {
                participantes: {
                  some: {
                    profesionalId: usuario.profesionalId as string,
                    activo: true,
                    puedeGestionarEvidencias: true,
                  },
                },
              }
            : {}),
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
      orderBy: [
        {
          gestion: {
            fechaGestion: "desc",
          },
        },
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: {
        id: true,
        estadoCumplimiento: true,
        calificacionAdministrativa: true,
        createdAt: true,
        aspecto: {
          select: {
            id: true,
            identidadHistorica: true,
            nombre: true,
          },
        },
        evidencias: {
          where: {
            activo: true,
          },
          select: {
            id: true,
          },
          take: 1,
        },
        seguimientosCompromiso: {
          select: {
            compromiso: {
              select: {
                id: true,
                evidencias: {
                  where: {
                    activa: true,
                  },
                  select: {
                    id: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
        gestion: {
          select: {
            finalizadaEn: true,
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
          },
        },
      },
    });

    const vistos = new Set<string>();
    const alertas: AlertaControlEvaluacion[] = [];
    const versionPorAnio = new Map<number, number>();
    const tareaPorVersionIdentidad = new Map<string, number | null>();

    for (const evaluacion of evaluaciones) {
      const periodo = evaluacion.gestion.empresaPeriodo;
      const identidad = evaluacion.aspecto.identidadHistorica;
      const clave = `${periodo.empresa.id}:${identidad}`;

      // La consulta viene ordenada de más reciente a más antigua. Una sola
      // alerta por identidad histórica evita duplicados al cambiar de versión.
      if (vistos.has(clave)) continue;
      vistos.add(clave);

      const estadoEvidencia = resolverEstadoEvidenciaAspecto({
        requiereEvidencia: true,
        estadoCumplimiento:
          evaluacion.estadoCumplimiento,
        calificacionAdministrativa:
          evaluacion.calificacionAdministrativa.toNumber(),
        gestionFinalizadaValida: true,
        tieneEvidenciaEvaluacion:
          evaluacion.evidencias.length > 0,
        compromisosConSoporte:
          evaluacion.seguimientosCompromiso
            .filter(
              ({ compromiso }) =>
                compromiso.evidencias.length > 0
            )
            .map(({ compromiso }) => compromiso.id),
      });

      if (!estadoEvidencia.evidenciaPendiente) {
        continue;
      }

      let versionSupermatrizId = versionPorAnio.get(periodo.anio);

      if (!versionSupermatrizId) {
        const version =
          await servicioPeriodosEvaluacion.resolverVersionParaFecha(
            construirCorteAnual(periodo.anio)
          );
        versionSupermatrizId = version.id;
        versionPorAnio.set(periodo.anio, version.id);
      }

      const claveTarea = `${versionSupermatrizId}:${identidad}`;
      let tareaId = tareaPorVersionIdentidad.get(claveTarea);

      if (tareaId === undefined) {
        const tareaActual = await prisma.supermatrizTarea.findFirst({
          where: {
            versionSupermatrizId,
            estado: EstadoRegistro.ACTIVO,
            aspecto: {
              identidadHistorica: identidad,
              estado: EstadoRegistro.ACTIVO,
            },
          },
          select: {
            id: true,
          },
          orderBy: {
            id: "asc",
          },
        });

        tareaId = tareaActual?.id ?? null;
        tareaPorVersionIdentidad.set(claveTarea, tareaId);
      }

      // Si el aspecto ya no existe en la estructura aplicable actual, no se
      // genera un enlace hacia una fila histórica que el drawer no puede abrir.
      if (!tareaId) {
        continue;
      }

      alertas.push({
        id: `EVIDENCIA_PENDIENTE:${evaluacion.id}`,
        compromisoId: evaluacion.id,
        tipo: "EVIDENCIA_PENDIENTE",
        nivel: "MEDIA",
        titulo: "Evidencia requerida pendiente",
        descripcion: `${periodo.empresa.nombre}: “${evaluacion.aspecto.nombre}” está calificado en 5, pero el aspecto exige evidencia y todavía no tiene un soporte asociado.`,
        empresa: periodo.empresa,
        aspecto: {
          id: evaluacion.aspecto.id,
          nombre: evaluacion.aspecto.nombre,
        },
        fechaLimite: (
          evaluacion.gestion.finalizadaEn ?? evaluacion.createdAt
        ).toISOString(),
        accion: {
          etiqueta: "Agregar evidencia",
          ruta: rutaEvidenciaPendiente(
            periodo.empresa.id,
            periodo.anio,
            tareaId
          ),
        },
      });
    }

    if (opciones.limiteConsulta === null) {
      return alertas;
    }

    return alertas.slice(0, opciones.limiteConsulta ?? 100);
  },
};
