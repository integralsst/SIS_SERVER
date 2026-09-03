import {
  EstadoAprobacionGestion,
  EstadoGestionSgsst,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  TIPO_ACTIVIDAD_EVALUACION_DESDE_BITACORA,
} from "../evaluacion/evaluacion-directa.constants";
import { TIPO_ACTIVIDAD_BITACORA_INTERNA } from "./bitacora.constants";
import { asegurarAccesoBitacoraEmpresa } from "./bitacora-permisos.service";
import { leerSnapshotBitacora } from "./bitacora-registros.service";

export type FuenteHistorialBitacora =
  | "BITACORA_IA"
  | "EVALUACION_MANUAL";

export interface RegistroHistorialBitacoraUnificado {
  id: string;
  fuente: FuenteHistorialBitacora;
  fechaEfectiva: string;
  contenidoOriginal: string;
  modalidad: string | null;
  tipoActividad: string | null;
  autor: {
    id: string;
    nombre: string;
    rol: string;
  } | null;
  creadoEn: string;
  estadoProcesamiento: string;
  aplicada: boolean;
  resultado: {
    estadoCumplimiento: string;
    calificacionAdministrativa: number;
  } | null;
  aspectos: Array<{
    id: number;
    codigo: string | null;
    nombre: string;
  }>;
  evidenciasUrls: string[];
}

function fechaCalendario(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function ordenarRegistros(
  a: RegistroHistorialBitacoraUnificado,
  b: RegistroHistorialBitacoraUnificado
): number {
  const porFecha = b.fechaEfectiva.localeCompare(a.fechaEfectiva);
  if (porFecha !== 0) return porFecha;
  return b.creadoEn.localeCompare(a.creadoEn);
}

export async function listarHistorialBitacoraUnificado(
  empresaId: string,
  usuario: UsuarioSesionEvaluacion,
  opciones: { limite?: number | null } = {}
): Promise<{
  empresa: { id: string; nombre: string };
  registros: RegistroHistorialBitacoraUnificado[];
}> {
  const empresa = await asegurarAccesoBitacoraEmpresa(usuario, empresaId);
  const limite = opciones.limite === undefined ? 100 : opciones.limite;

  const [bitacoras, evaluacionesManuales] = await Promise.all([
    prisma.gestionSgsst.findMany({
      where: {
        empresaPeriodo: { empresaId },
        tipoActividad: TIPO_ACTIVIDAD_BITACORA_INTERNA,
        valida: false,
      },
      include: {
        usuarioCreador: {
          select: {
            id: true,
            nombre: true,
            rol: true,
          },
        },
        aprobacion: true,
      },
      orderBy: [
        { fechaGestion: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.evaluacionAspecto.findMany({
      where: {
        gestion: {
          empresaPeriodo: { empresaId },
          estado: EstadoGestionSgsst.FINALIZADA,
          valida: true,
          tipoActividad: {
            not: TIPO_ACTIVIDAD_EVALUACION_DESDE_BITACORA,
          },
        },
      },
      select: {
        id: true,
        estadoCumplimiento: true,
        calificacionAdministrativa: true,
        observacion: true,
        createdAt: true,
        aspecto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        usuarioRegistrador: {
          select: {
            id: true,
            nombre: true,
            rol: true,
          },
        },
        evidencias: {
          where: { activo: true },
          select: { url: true },
        },
        gestion: {
          select: {
            fechaGestion: true,
            modalidad: true,
            tipoActividad: true,
          },
        },
      },
      orderBy: [
        { gestion: { fechaGestion: "desc" } },
        { createdAt: "desc" },
      ],
    }),
  ]);

  const registrosBitacora: RegistroHistorialBitacoraUnificado[] =
    bitacoras.map((registro) => {
      const snapshot = registro.aprobacion
        ? leerSnapshotBitacora(registro.aprobacion.reglasAplicadas)
        : null;
      const propuestas = snapshot?.analisis.propuestas ?? [];
      const candidatos = new Map(
        (snapshot?.recuperacion.aspectosCandidatos ?? []).map((item) => [
          item.aspectoId,
          item,
        ])
      );
      const aspectos = [
        ...new Map(
          propuestas
            .filter(
              (propuesta) =>
                propuesta.accion === "PROPONER_EVALUACION" ||
                Boolean(propuesta.evidenciaBitacora)
            )
            .map((propuesta) => {
              const candidato = candidatos.get(propuesta.aspectoId);
              return [
                propuesta.aspectoId,
                {
                  id: propuesta.aspectoId,
                  codigo: candidato?.codigo ?? null,
                  nombre:
                    candidato?.nombre ??
                    `Aspecto ${propuesta.aspectoId}`,
                },
              ] as const;
            })
        ).values(),
      ];
      const evidenciasUrls = [
        ...new Set(
          propuestas.flatMap((propuesta) => propuesta.evidenciasUrls)
        ),
      ];

      return {
        id: registro.id,
        fuente: "BITACORA_IA" as const,
        fechaEfectiva: fechaCalendario(registro.fechaGestion),
        contenidoOriginal: registro.observacionGeneral ?? "",
        modalidad: snapshot?.modalidadOriginal ?? registro.modalidad,
        tipoActividad: snapshot?.tipoActividadOriginal ?? null,
        autor: registro.usuarioCreador,
        creadoEn: registro.createdAt.toISOString(),
        estadoProcesamiento: snapshot?.estadoProcesamiento ?? "ERROR",
        aplicada:
          registro.aprobacion?.estado ===
          EstadoAprobacionGestion.APROBADA,
        resultado: null,
        aspectos,
        evidenciasUrls,
      };
    });

  const registrosManual: RegistroHistorialBitacoraUnificado[] =
    evaluacionesManuales.map((evaluacion) => ({
      id: `EVAL:${evaluacion.id}`,
      fuente: "EVALUACION_MANUAL" as const,
      fechaEfectiva: fechaCalendario(
        evaluacion.gestion.fechaGestion
      ),
      contenidoOriginal:
        evaluacion.observacion?.trim() ||
        `Se registró manualmente la evaluación del aspecto ${evaluacion.aspecto.codigo ?? evaluacion.aspecto.id} · ${evaluacion.aspecto.nombre}.`,
      modalidad: evaluacion.gestion.modalidad,
      tipoActividad:
        evaluacion.gestion.tipoActividad ?? "Evaluación manual",
      autor: evaluacion.usuarioRegistrador,
      creadoEn: evaluacion.createdAt.toISOString(),
      estadoProcesamiento: "APLICADA",
      aplicada: true,
      resultado: {
        estadoCumplimiento: evaluacion.estadoCumplimiento,
        calificacionAdministrativa:
          evaluacion.calificacionAdministrativa.toNumber(),
      },
      aspectos: [evaluacion.aspecto],
      evidenciasUrls: [
        ...new Set(
          evaluacion.evidencias
            .map((evidencia) => evidencia.url?.trim() ?? "")
            .filter(Boolean)
        ),
      ],
    }));

  const registros = [
    ...registrosBitacora,
    ...registrosManual,
  ].sort(ordenarRegistros);

  return {
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
    },
    registros:
      limite === null ? registros : registros.slice(0, Math.max(1, limite)),
  };
}
