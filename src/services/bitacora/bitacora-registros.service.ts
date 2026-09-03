import {
  EstadoAprobacionGestion,
  EstadoGestionSgsst,
  ModalidadGestion,
  Prisma,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type {
  CrearRegistroBitacoraInput,
  PropuestaAspectoBitacora,
} from "../../types/bitacora.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { validarCrearRegistroBitacora } from "../../validators/bitacora/bitacora.validator";
import { servicioPeriodosEvaluacion } from "../evaluacion/periodos-evaluacion.service";
import {
  ORIGEN_BITACORA_IA,
  TIPO_ACTIVIDAD_BITACORA_INTERNA,
} from "./bitacora.constants";
import { extraerUrlsBitacora } from "./bitacora-enlaces.service";
import { asegurarAccesoBitacoraEmpresa } from "./bitacora-permisos.service";
import { analizarRegistroBitacoraConIa } from "./ia/bitacora-ai.service";
import { buscarCandidatosAspectoBitacora } from "./recuperacion/candidatos-aspecto.service";
import { cargarContextoAspectosBitacora } from "./recuperacion/contexto-aspecto.service";

export interface EventoHistorialBitacora {
  accion: "REGISTRO_GUARDADO" | "ANALISIS_COMPLETADO" | "ANALISIS_ERROR" | "APLICACION_COMPLETADA";
  fecha: string;
  usuarioId: string;
  detalle?: string | null;
}

export interface SnapshotBitacoraIa {
  origen: typeof ORIGEN_BITACORA_IA;
  estadoProcesamiento: "ANALIZANDO" | "ANALIZADA" | "ERROR" | "APLICADA";
  fechaEfectiva: string;
  modalidadOriginal: ModalidadGestion | null;
  tipoActividadOriginal: string | null;
  versionSupermatriz: {
    id: number;
    nombre: string;
  };
  urlsDetectadas: string[];
  recuperacion: {
    totalCandidatos: number;
    aspectosCandidatos: Array<{
      aspectoId: number;
      identidadHistorica: string;
      codigo: string | null;
      nombre: string;
      puntajeRecuperacion: number;
    }>;
  };
  analisis: {
    modelo: string | null;
    versionPrompt: string | null;
    propuestas: PropuestaAspectoBitacora[];
    error?: string | null;
  };
  historial: EventoHistorialBitacora[];
  aplicacion?: {
    aplicadaEn: string;
    aplicadaPorUsuarioId: string;
    aspectoIdsExcluidos: number[];
    evaluaciones: Array<{
      id: string;
      aspectoId: number;
      gestionId: string;
    }>;
    totalEvidenciasVinculadas: number;
  } | null;
}

function aJsonPrisma(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function fechaIsoCalendario(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function crearResumen(propuestas: PropuestaAspectoBitacora[]) {
  const evaluaciones = propuestas.filter(
    (propuesta) => propuesta.accion === "PROPONER_EVALUACION"
  );
  const requierenRevision = propuestas.filter(
    (propuesta) =>
      propuesta.accion === "INFORMACION_INSUFICIENTE" ||
      propuesta.accion === "REQUIERE_REVISION_HUMANA"
  );
  const sinCambio = propuestas.filter(
    (propuesta) => propuesta.accion === "SIN_CAMBIO"
  );
  const evidenciasUrls = [
    ...new Set(evaluaciones.flatMap((propuesta) => propuesta.evidenciasUrls)),
  ];

  return {
    totalAspectosAnalizados: propuestas.length,
    totalEvaluacionesPropuestas: evaluaciones.length,
    totalRequierenRevision: requierenRevision.length,
    totalSinCambio: sinCambio.length,
    totalEvidenciasDetectadas: evidenciasUrls.length,
    evaluaciones,
    requierenRevision,
    evidenciasUrls,
  };
}

export function leerSnapshotBitacora(
  value: Prisma.JsonValue
): SnapshotBitacoraIa {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("El registro de Bitácora no contiene un snapshot válido.");
  }

  const snapshot = value as unknown as SnapshotBitacoraIa;
  if (snapshot.origen !== ORIGEN_BITACORA_IA) {
    throw new Error("El registro no pertenece al flujo de Bitácora IA.");
  }

  return snapshot;
}

export async function guardarYAnalizarBitacora(
  empresaId: string,
  input: CrearRegistroBitacoraInput,
  usuario: UsuarioSesionEvaluacion
) {
  const validado = validarCrearRegistroBitacora(input);
  const empresa = await asegurarAccesoBitacoraEmpresa(usuario, empresaId);
  const version = await servicioPeriodosEvaluacion.resolverVersionParaFecha(
    validado.fechaEfectiva
  );
  const anio = validado.fechaEfectiva.getUTCFullYear();
  const periodo = await servicioPeriodosEvaluacion.abrir(
    empresaId,
    { anio },
    usuario
  );

  const urlsDetectadas = extraerUrlsBitacora(validado.contenido);
  const fechaEfectiva = fechaIsoCalendario(validado.fechaEfectiva);
  const ahora = new Date().toISOString();

  const snapshotInicial: SnapshotBitacoraIa = {
    origen: ORIGEN_BITACORA_IA,
    estadoProcesamiento: "ANALIZANDO",
    fechaEfectiva,
    modalidadOriginal: validado.modalidad ?? null,
    tipoActividadOriginal: validado.tipoActividad,
    versionSupermatriz: {
      id: version.id,
      nombre: version.nombre,
    },
    urlsDetectadas,
    recuperacion: {
      totalCandidatos: 0,
      aspectosCandidatos: [],
    },
    analisis: {
      modelo: null,
      versionPrompt: null,
      propuestas: [],
    },
    historial: [
      {
        accion: "REGISTRO_GUARDADO",
        fecha: ahora,
        usuarioId: usuario.usuarioId,
      },
    ],
    aplicacion: null,
  };

  const registro = await prisma.$transaction(async (tx) => {
    const gestion = await tx.gestionSgsst.create({
      data: {
        empresaPeriodoId: periodo.id,
        profesionalId: usuario.profesionalId,
        categoriaGestionId: null,
        usuarioCreadorId: usuario.usuarioId,
        fechaGestion: validado.fechaEfectiva,
        modalidad: validado.modalidad ?? ModalidadGestion.SEGUIMIENTO_PUNTUAL,
        tipoActividad: TIPO_ACTIVIDAD_BITACORA_INTERNA,
        observacionGeneral: validado.contenido,
        estado: EstadoGestionSgsst.FINALIZADA,
        // La Bitácora es historial técnico, no una gestión evaluativa oficial.
        valida: false,
        finalizadaEn: new Date(),
      },
    });

    const aprobacion = await tx.aprobacionGestion.create({
      data: {
        gestionId: gestion.id,
        estado: EstadoAprobacionGestion.PENDIENTE,
        reglasAplicadas: aJsonPrisma(snapshotInicial),
      },
    });

    return {
      gestion,
      aprobacion,
    };
  });

  console.info("[BITACORA-ASISTIDA] registro-guardado", {
    empresaId,
    registroId: registro.gestion.id,
    fechaEfectiva,
    usuarioId: usuario.usuarioId,
    totalUrls: urlsDetectadas.length,
  });

  try {
    const candidatos = await buscarCandidatosAspectoBitacora({
      versionSupermatrizId: version.id,
      contenidoBitacora: validado.contenido,
    });
    const contextoAspectos = await cargarContextoAspectosBitacora({
      empresaId,
      versionSupermatrizId: version.id,
      fechaEfectiva: validado.fechaEfectiva,
      candidatos,
    });
    const analisis = await analizarRegistroBitacoraConIa({
      registroBitacoraId: registro.gestion.id,
      fechaEfectiva,
      contenidoOriginal: validado.contenido,
      urlsDisponibles: urlsDetectadas,
      aspectos: contextoAspectos,
    });

    const snapshotFinal: SnapshotBitacoraIa = {
      ...snapshotInicial,
      estadoProcesamiento: "ANALIZADA",
      recuperacion: {
        totalCandidatos: candidatos.length,
        aspectosCandidatos: candidatos.map((candidato) => ({
          aspectoId: candidato.aspectoId,
          identidadHistorica: candidato.identidadHistorica,
          codigo: candidato.codigo,
          nombre: candidato.nombre,
          puntajeRecuperacion: candidato.puntajeRecuperacion,
        })),
      },
      analisis: {
        modelo: analisis.modelo,
        versionPrompt: analisis.versionPrompt,
        propuestas: analisis.propuestas,
      },
      historial: [
        ...snapshotInicial.historial,
        {
          accion: "ANALISIS_COMPLETADO",
          fecha: new Date().toISOString(),
          usuarioId: usuario.usuarioId,
        },
      ],
    };

    await prisma.aprobacionGestion.update({
      where: { id: registro.aprobacion.id },
      data: {
        reglasAplicadas: aJsonPrisma(snapshotFinal),
      },
    });

    return {
      modo: "ASISTIDA" as const,
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre,
      },
      registro: {
        id: registro.gestion.id,
        fechaEfectiva,
        contenidoOriginal: validado.contenido,
        modalidad: validado.modalidad ?? null,
        tipoActividad: validado.tipoActividad,
        creadoEn: registro.gestion.createdAt.toISOString(),
      },
      versionSupermatriz: snapshotFinal.versionSupermatriz,
      recuperacion: snapshotFinal.recuperacion,
      analisis: snapshotFinal.analisis,
      resumen: crearResumen(snapshotFinal.analisis.propuestas),
      estadoProcesamiento: snapshotFinal.estadoProcesamiento,
      escrituraEvaluacionRealizada: false,
    };
  } catch (error) {
    const snapshotError: SnapshotBitacoraIa = {
      ...snapshotInicial,
      estadoProcesamiento: "ERROR",
      analisis: {
        ...snapshotInicial.analisis,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      historial: [
        ...snapshotInicial.historial,
        {
          accion: "ANALISIS_ERROR",
          fecha: new Date().toISOString(),
          usuarioId: usuario.usuarioId,
          detalle: error instanceof Error ? error.message : "Error desconocido",
        },
      ],
    };

    await prisma.aprobacionGestion.update({
      where: { id: registro.aprobacion.id },
      data: {
        reglasAplicadas: aJsonPrisma(snapshotError),
      },
    });

    console.error("[BITACORA-ASISTIDA] analisis-error", {
      empresaId,
      registroId: registro.gestion.id,
      error: error instanceof Error ? error.message : "error-desconocido",
    });

    throw error;
  }
}

export async function listarBitacorasEmpresa(
  empresaId: string,
  usuario: UsuarioSesionEvaluacion
) {
  await asegurarAccesoBitacoraEmpresa(usuario, empresaId);

  const registros = await prisma.gestionSgsst.findMany({
    where: {
      empresaPeriodo: {
        empresaId,
      },
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
    take: 100,
  });

  return registros.map((registro) => {
    const snapshot = registro.aprobacion
      ? leerSnapshotBitacora(registro.aprobacion.reglasAplicadas)
      : null;

    return {
      id: registro.id,
      fechaEfectiva: fechaIsoCalendario(registro.fechaGestion),
      contenidoOriginal: registro.observacionGeneral ?? "",
      modalidad: snapshot?.modalidadOriginal ?? registro.modalidad,
      tipoActividad: snapshot?.tipoActividadOriginal ?? null,
      autor: registro.usuarioCreador,
      creadoEn: registro.createdAt.toISOString(),
      estadoProcesamiento: snapshot?.estadoProcesamiento ?? "ERROR",
      resumen: snapshot ? crearResumen(snapshot.analisis.propuestas) : null,
      aplicada: registro.aprobacion?.estado === EstadoAprobacionGestion.APROBADA,
      aplicacion: snapshot?.aplicacion ?? null,
    };
  });
}
