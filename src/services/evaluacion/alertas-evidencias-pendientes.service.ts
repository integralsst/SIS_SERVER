import {
  EstadoGestionSgsst,
  EstadoPeriodoSgsst,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import type { AlertaControlEvaluacion } from "./alertas-control-evaluacion.service";
import { resolverEstadoEvidenciaAspecto } from "./estado-evidencia-aspecto.service";

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
          ...(usuario.rol === RolUsuario.PROFESIONAL
            ? { usuarioCreadorId: usuario.usuarioId }
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
      ],
      select: {
        id: true,
        aspectoId: true,
        estadoCumplimiento: true,
        calificacionAdministrativa: true,
        createdAt: true,
        supermatrizTarea: {
          select: {
            id: true,
          },
        },
        aspecto: {
          select: {
            id: true,
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
            empresaPeriodoId: true,
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

    for (const evaluacion of evaluaciones) {
      const clave = `${evaluacion.gestion.empresaPeriodoId}:${evaluacion.aspectoId}`;

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

      if (
        !estadoEvidencia.evidenciaPendiente ||
        !evaluacion.supermatrizTarea
      ) {
        continue;
      }

      const periodo = evaluacion.gestion.empresaPeriodo;

      alertas.push({
        id: `EVIDENCIA_PENDIENTE:${evaluacion.id}`,
        compromisoId: evaluacion.id,
        tipo: "EVIDENCIA_PENDIENTE",
        nivel: "MEDIA",
        titulo: "Evidencia requerida pendiente",
        descripcion: `${periodo.empresa.nombre}: “${evaluacion.aspecto.nombre}” está calificado en 5, pero el aspecto exige evidencia y todavía no tiene un soporte asociado.`,
        empresa: periodo.empresa,
        aspecto: evaluacion.aspecto,
        fechaLimite: (
          evaluacion.gestion.finalizadaEn ?? evaluacion.createdAt
        ).toISOString(),
        accion: {
          etiqueta: "Agregar evidencia",
          ruta: rutaEvidenciaPendiente(
            periodo.empresa.id,
            periodo.anio,
            evaluacion.supermatrizTarea.id
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
