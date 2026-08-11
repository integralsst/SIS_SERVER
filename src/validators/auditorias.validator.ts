import {
  EstadoAuditoriaSgsst,
  EstadoHallazgoAuditoria,
  EstadoRecomendacionAuditoria,
  TipoHallazgoAuditoria,
} from "@prisma/client";

import type {
  ActualizarAuditoriaInput,
  ActualizarHallazgoAuditoriaInput,
  ActualizarRecomendacionAuditoriaInput,
  CambiarEstadoAuditoriaInput,
  ConsultaAuditorias,
  CrearAuditoriaInput,
  CrearHallazgoAuditoriaInput,
  CrearRecomendacionAuditoriaInput,
  CrearSeguimientoAuditoriaInput,
} from "../types/auditorias.types";
import { ErrorEvaluacion } from "../utils/evaluacion";

function textoObligatorio(
  valor: unknown,
  campo: string,
  maximo = 5_000
): string {
  const texto = String(valor ?? "").trim();
  if (!texto) {
    throw new ErrorEvaluacion(
      `El campo ${campo} es obligatorio.`,
      400,
      "AUDITORIA_CAMPO_OBLIGATORIO"
    );
  }
  if (texto.length > maximo) {
    throw new ErrorEvaluacion(
      `El campo ${campo} supera la longitud permitida.`,
      400,
      "AUDITORIA_CAMPO_INVALIDO"
    );
  }
  return texto;
}

function textoOpcional(valor: unknown, maximo = 10_000): string | null {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  if (texto.length > maximo) {
    throw new ErrorEvaluacion(
      "Uno de los campos de texto supera la longitud permitida.",
      400,
      "AUDITORIA_CAMPO_INVALIDO"
    );
  }
  return texto;
}

function fechaIsoOpcional(valor: unknown, campo: string): string | null {
  if (valor === undefined || valor === null || valor === "") return null;
  const texto = String(valor).trim();
  const fecha = new Date(texto);
  if (!texto || Number.isNaN(fecha.getTime())) {
    throw new ErrorEvaluacion(
      `El campo ${campo} debe contener una fecha válida.`,
      400,
      "AUDITORIA_FECHA_INVALIDA"
    );
  }
  return texto;
}

function enteroPositivo(valor: unknown, defecto: number, maximo: number): number {
  const numero = Number(valor ?? defecto);
  if (!Number.isInteger(numero) || numero < 1 || numero > maximo) {
    throw new ErrorEvaluacion(
      `El valor debe ser un entero entre 1 y ${maximo}.`,
      400,
      "AUDITORIA_FILTRO_INVALIDO"
    );
  }
  return numero;
}

function enumValue<T extends string>(
  valor: unknown,
  permitidos: readonly T[],
  campo: string
): T {
  const normalizado = String(valor ?? "").trim().toUpperCase() as T;
  if (!permitidos.includes(normalizado)) {
    throw new ErrorEvaluacion(
      `El campo ${campo} no contiene un valor permitido.`,
      400,
      "AUDITORIA_ENUM_INVALIDO"
    );
  }
  return normalizado;
}

const ESTADOS_AUDITORIA = Object.values(EstadoAuditoriaSgsst);
const TIPOS_HALLAZGO = Object.values(TipoHallazgoAuditoria);
const ESTADOS_HALLAZGO = Object.values(EstadoHallazgoAuditoria);
const ESTADOS_RECOMENDACION = Object.values(EstadoRecomendacionAuditoria);

export function normalizarConsultaAuditorias(
  query: Record<string, unknown>
): ConsultaAuditorias {
  const anioRaw = query.anio ?? query.year;
  const estadoRaw = query.estado;
  const empresaRaw = query.empresaId;

  return {
    busqueda: String(query.busqueda ?? query.search ?? "").trim(),
    empresaId:
      typeof empresaRaw === "string" && empresaRaw.trim()
        ? empresaRaw.trim()
        : undefined,
    anio:
      anioRaw === undefined || anioRaw === ""
        ? undefined
        : enteroPositivo(anioRaw, new Date().getFullYear(), 9999),
    estado:
      estadoRaw === undefined || estadoRaw === ""
        ? undefined
        : enumValue(estadoRaw, ESTADOS_AUDITORIA, "estado"),
    pagina: enteroPositivo(query.pagina ?? query.page, 1, 100_000),
    limite: enteroPositivo(query.limite ?? query.limit, 25, 100),
  };
}

export function normalizarCrearAuditoria(body: Record<string, unknown>): CrearAuditoriaInput {
  return {
    empresaId: textoObligatorio(body.empresaId, "empresaId", 100),
    anio: enteroPositivo(body.anio, new Date().getFullYear(), 9999),
    titulo: textoObligatorio(body.titulo, "titulo", 191),
    objetivo: textoOpcional(body.objetivo),
    alcance: textoOpcional(body.alcance),
    fechaAuditoria: fechaIsoOpcional(body.fechaAuditoria, "fechaAuditoria") ?? (() => {
      throw new ErrorEvaluacion(
        "El campo fechaAuditoria es obligatorio.",
        400,
        "AUDITORIA_FECHA_OBLIGATORIA"
      );
    })(),
  };
}

export function normalizarActualizarAuditoria(
  body: Record<string, unknown>
): ActualizarAuditoriaInput {
  const data: ActualizarAuditoriaInput = {};
  if (body.titulo !== undefined) data.titulo = textoObligatorio(body.titulo, "titulo", 191);
  if (body.objetivo !== undefined) data.objetivo = textoOpcional(body.objetivo);
  if (body.alcance !== undefined) data.alcance = textoOpcional(body.alcance);
  if (body.fechaAuditoria !== undefined) {
    data.fechaAuditoria = fechaIsoOpcional(body.fechaAuditoria, "fechaAuditoria") ?? undefined;
  }
  return data;
}

export function normalizarCambiarEstadoAuditoria(
  body: Record<string, unknown>
): CambiarEstadoAuditoriaInput {
  return {
    estado: enumValue(body.estado, ESTADOS_AUDITORIA, "estado"),
    motivo: textoOpcional(body.motivo),
  };
}

export function normalizarCrearHallazgo(
  body: Record<string, unknown>
): CrearHallazgoAuditoriaInput {
  const aspectoId = body.aspectoId === undefined || body.aspectoId === null || body.aspectoId === ""
    ? null
    : enteroPositivo(body.aspectoId, 1, 2_000_000_000);

  return {
    aspectoId,
    tipo: enumValue(body.tipo, TIPOS_HALLAZGO, "tipo"),
    titulo: textoObligatorio(body.titulo, "titulo", 191),
    descripcion: textoObligatorio(body.descripcion, "descripcion"),
    evidencia: textoOpcional(body.evidencia),
    responsableUsuarioId: textoOpcional(body.responsableUsuarioId, 100),
    fechaObjetivo: fechaIsoOpcional(body.fechaObjetivo, "fechaObjetivo"),
  };
}

export function normalizarActualizarHallazgo(
  body: Record<string, unknown>
): ActualizarHallazgoAuditoriaInput {
  const data: ActualizarHallazgoAuditoriaInput = {};
  if (body.aspectoId !== undefined) {
    data.aspectoId = body.aspectoId === null || body.aspectoId === ""
      ? null
      : enteroPositivo(body.aspectoId, 1, 2_000_000_000);
  }
  if (body.tipo !== undefined) data.tipo = enumValue(body.tipo, TIPOS_HALLAZGO, "tipo");
  if (body.titulo !== undefined) data.titulo = textoObligatorio(body.titulo, "titulo", 191);
  if (body.descripcion !== undefined) data.descripcion = textoObligatorio(body.descripcion, "descripcion");
  if (body.evidencia !== undefined) data.evidencia = textoOpcional(body.evidencia);
  if (body.responsableUsuarioId !== undefined) {
    data.responsableUsuarioId = textoOpcional(body.responsableUsuarioId, 100);
  }
  if (body.fechaObjetivo !== undefined) {
    data.fechaObjetivo = fechaIsoOpcional(body.fechaObjetivo, "fechaObjetivo");
  }
  return data;
}

export function normalizarCrearRecomendacion(
  body: Record<string, unknown>
): CrearRecomendacionAuditoriaInput {
  return {
    descripcion: textoObligatorio(body.descripcion, "descripcion"),
    responsableUsuarioId: textoOpcional(body.responsableUsuarioId, 100),
    fechaObjetivo: fechaIsoOpcional(body.fechaObjetivo, "fechaObjetivo"),
  };
}

export function normalizarActualizarRecomendacion(
  body: Record<string, unknown>
): ActualizarRecomendacionAuditoriaInput {
  const data: ActualizarRecomendacionAuditoriaInput = {};
  if (body.descripcion !== undefined) data.descripcion = textoObligatorio(body.descripcion, "descripcion");
  if (body.responsableUsuarioId !== undefined) {
    data.responsableUsuarioId = textoOpcional(body.responsableUsuarioId, 100);
  }
  if (body.fechaObjetivo !== undefined) {
    data.fechaObjetivo = fechaIsoOpcional(body.fechaObjetivo, "fechaObjetivo");
  }
  return data;
}

export function normalizarCrearSeguimiento(
  body: Record<string, unknown>
): CrearSeguimientoAuditoriaInput {
  return {
    descripcion: textoObligatorio(body.descripcion, "descripcion"),
    recomendacionId: textoOpcional(body.recomendacionId, 100),
    estadoHallazgo:
      body.estadoHallazgo === undefined || body.estadoHallazgo === null || body.estadoHallazgo === ""
        ? null
        : enumValue(body.estadoHallazgo, ESTADOS_HALLAZGO, "estadoHallazgo"),
    estadoRecomendacion:
      body.estadoRecomendacion === undefined || body.estadoRecomendacion === null || body.estadoRecomendacion === ""
        ? null
        : enumValue(
            body.estadoRecomendacion,
            ESTADOS_RECOMENDACION,
            "estadoRecomendacion"
          ),
  };
}
