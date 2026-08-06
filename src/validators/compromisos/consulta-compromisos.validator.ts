import {
  EstadoCompromiso,
} from "@prisma/client";

import type {
  AlcanceConsultaCompromisos,
  ConsultaCompromisosInput,
  FiltroEstadoCompromiso,
  FiltroVencimientoCompromiso,
} from "../../types/compromisos/consulta-compromisos.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";

function primerValor(
  value: unknown
): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    Array.isArray(value) &&
    typeof value[0] === "string"
  ) {
    return value[0].trim();
  }

  return "";
}

function numeroEntero(
  value: unknown,
  predeterminado: number,
  minimo: number,
  maximo: number
): number {
  const texto = primerValor(value);

  if (!texto) {
    return predeterminado;
  }

  const numero = Number(texto);

  if (
    !Number.isInteger(numero) ||
    numero < minimo ||
    numero > maximo
  ) {
    throw new ErrorEvaluacion(
      "Los parámetros de paginación no son válidos.",
      400,
      "PAGINACION_INVALIDA"
    );
  }

  return numero;
}

function normalizarAlcance(
  value: unknown
): AlcanceConsultaCompromisos {
  const alcance = primerValor(value).toUpperCase();

  if (!alcance) {
    return "SUPERVISION";
  }

  if (
    alcance === "SUPERVISION" ||
    alcance === "MIS_COMPROMISOS"
  ) {
    return alcance;
  }

  throw new ErrorEvaluacion(
    "El alcance de compromisos no es válido.",
    400,
    "ALCANCE_COMPROMISOS_INVALIDO"
  );
}

function normalizarEstado(
  value: unknown
): FiltroEstadoCompromiso | null {
  const estado = primerValor(value).toUpperCase();

  if (!estado) {
    return null;
  }

  if (estado === "ABIERTOS") {
    return estado;
  }

  if (
    Object.values(EstadoCompromiso).includes(
      estado as EstadoCompromiso
    )
  ) {
    return estado as EstadoCompromiso;
  }

  throw new ErrorEvaluacion(
    "El estado de compromiso no es válido.",
    400,
    "ESTADO_COMPROMISO_INVALIDO"
  );
}

function normalizarVencimiento(
  value: unknown
): FiltroVencimientoCompromiso {
  const vencimiento =
    primerValor(value).toUpperCase() || "TODOS";

  const permitidos: FiltroVencimientoCompromiso[] = [
    "TODOS",
    "VENCIDOS",
    "PROXIMOS_30_DIAS",
    "VIGENTES",
    "CERRADOS",
  ];

  if (
    permitidos.includes(
      vencimiento as FiltroVencimientoCompromiso
    )
  ) {
    return vencimiento as FiltroVencimientoCompromiso;
  }

  throw new ErrorEvaluacion(
    "El filtro de vencimiento no es válido.",
    400,
    "VENCIMIENTO_COMPROMISO_INVALIDO"
  );
}

export function normalizarConsultaCompromisos(
  query: Record<string, unknown>
): ConsultaCompromisosInput {
  return {
    alcance: normalizarAlcance(query.alcance),
    pagina: numeroEntero(
      query.pagina,
      1,
      1,
      100000
    ),
    limite: numeroEntero(
      query.limite,
      20,
      1,
      100
    ),
    busqueda:
      primerValor(query.busqueda) || null,
    empresaId:
      primerValor(query.empresaId) || null,
    empresa:
      primerValor(query.empresa) || null,
    responsableId:
      primerValor(query.responsableId) || null,
    responsable:
      primerValor(query.responsable) || null,
    proceso:
      primerValor(query.proceso) || null,
    aspecto:
      primerValor(query.aspecto) || null,
    estado: normalizarEstado(query.estado),
    vencimiento: normalizarVencimiento(
      query.vencimiento
    ),
  };
}
