import type {
  CambiarEstadoActividadCompromisoInput,
  CrearEvidenciaCompromisoInput,
  CrearSeguimientoCompromisoInput,
  DecidirCierreCompromisoInput,
  ReasignarCompromisoInput,
  RechazarAsignacionCompromisoInput,
} from "../../types/compromisos/operacion-compromisos.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";

function objeto(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ErrorEvaluacion(
      "El cuerpo de la solicitud no es válido.",
      400,
      "CUERPO_SOLICITUD_INVALIDO"
    );
  }

  return value as Record<string, unknown>;
}

function textoObligatorio(
  value: unknown,
  campo: string,
  maximo = 4000
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ErrorEvaluacion(
      `El campo ${campo} es obligatorio.`,
      400,
      "CAMPO_OBLIGATORIO"
    );
  }

  const texto = value.trim();

  if (texto.length > maximo) {
    throw new ErrorEvaluacion(
      `El campo ${campo} no puede superar ${maximo} caracteres.`,
      400,
      "CAMPO_DEMASIADO_LARGO"
    );
  }

  return texto;
}

function textoOpcional(
  value: unknown,
  campo: string,
  maximo = 4000
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return textoObligatorio(value, campo, maximo);
}

function booleano(
  value: unknown,
  predeterminado: boolean
): boolean {
  return typeof value === "boolean"
    ? value
    : predeterminado;
}

function urlHttp(value: unknown): string {
  const texto = textoObligatorio(value, "url", 2000);
  let url: URL;

  try {
    url = new URL(texto);
  } catch {
    throw new ErrorEvaluacion(
      "La URL de la evidencia no es válida.",
      400,
      "URL_EVIDENCIA_INVALIDA"
    );
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ErrorEvaluacion(
      "La evidencia debe usar una URL http o https.",
      400,
      "URL_EVIDENCIA_INVALIDA"
    );
  }

  return url.toString();
}

export function validarCrearSeguimiento(
  value: unknown
): CrearSeguimientoCompromisoInput {
  const data = objeto(value);

  return {
    descripcion: textoObligatorio(
      data.descripcion,
      "descripcion"
    ),
    actividadId: textoOpcional(
      data.actividadId,
      "actividadId",
      191
    ),
    visibleCliente: booleano(
      data.visibleCliente,
      false
    ),
  };
}

export function validarCambiarActividad(
  value: unknown
): CambiarEstadoActividadCompromisoInput {
  const data = objeto(value);

  if (typeof data.atendida !== "boolean") {
    throw new ErrorEvaluacion(
      "El campo atendida debe ser verdadero o falso.",
      400,
      "ESTADO_ACTIVIDAD_INVALIDO"
    );
  }

  return {
    atendida: data.atendida,
  };
}

export function validarCrearEvidencia(
  value: unknown
): CrearEvidenciaCompromisoInput {
  const data = objeto(value);

  return {
    nombre: textoObligatorio(
      data.nombre,
      "nombre",
      191
    ),
    url: urlHttp(data.url),
    descripcion: textoOpcional(
      data.descripcion,
      "descripcion"
    ),
    fechaDocumento: textoOpcional(
      data.fechaDocumento,
      "fechaDocumento",
      10
    ),
    visibleCliente: booleano(
      data.visibleCliente,
      false
    ),
    seguimientoId: textoOpcional(
      data.seguimientoId,
      "seguimientoId",
      191
    ),
  };
}

export function validarRechazarAsignacion(
  value: unknown
): RechazarAsignacionCompromisoInput {
  const data = objeto(value);

  return {
    motivo: textoObligatorio(
      data.motivo,
      "motivo"
    ),
  };
}

export function validarReasignarCompromiso(
  value: unknown
): ReasignarCompromisoInput {
  const data = objeto(value);

  return {
    asignacionRechazadaId: textoObligatorio(
      data.asignacionRechazadaId,
      "asignacionRechazadaId",
      191
    ),
    nuevoUsuarioResponsableId: textoObligatorio(
      data.nuevoUsuarioResponsableId,
      "nuevoUsuarioResponsableId",
      191
    ),
  };
}

export function validarDecidirCierre(
  value: unknown
): DecidirCierreCompromisoInput {
  const data = objeto(value);
  const decision = textoObligatorio(
    data.decision,
    "decision",
    20
  ).toUpperCase();

  if (decision !== "APROBAR" && decision !== "DEVOLVER") {
    throw new ErrorEvaluacion(
      "La decisión de cierre debe ser APROBAR o DEVOLVER.",
      400,
      "DECISION_CIERRE_INVALIDA"
    );
  }

  return {
    decision,
    mensaje: textoObligatorio(
      data.mensaje,
      "mensaje"
    ),
  };
}
