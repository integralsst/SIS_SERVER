import type {
  Request,
  Response,
} from "express";

import type { UsuarioSesionEvaluacion } from "../../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../../utils/evaluacion";

export function obtenerUsuarioSesion(
  req: Request
): UsuarioSesionEvaluacion {
  if (!req.user) {
    throw new ErrorEvaluacion(
      "No autenticado.",
      401,
      "NO_AUTENTICADO"
    );
  }

  return {
    usuarioId: req.user.usuarioId,
    rol: req.user.rol,
    empresaId: req.user.empresaId,
    profesionalId: req.user.profesionalId,
  };
}

export function obtenerParametroRuta(
  req: Request,
  nombre: string
): string {
  const valor = req.params[nombre];

  if (typeof valor === "string") {
    const valorLimpio = valor.trim();

    if (valorLimpio) {
      return valorLimpio;
    }
  }

  if (Array.isArray(valor)) {
    const primerValor = valor[0];

    if (typeof primerValor === "string") {
      const valorLimpio = primerValor.trim();

      if (valorLimpio) {
        return valorLimpio;
      }
    }
  }

  throw new ErrorEvaluacion(
    `El parámetro de ruta "${nombre}" es obligatorio.`,
    400,
    "PARAMETRO_RUTA_INVALIDO"
  );
}

export function responderErrorEvaluacion(
  error: unknown,
  res: Response
): void {
  console.error("[MODULO-EVALUACION]", error);

  if (error instanceof ErrorEvaluacion) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  res.status(500).json({
    error:
      "Ocurrió un error interno en el módulo de evaluación.",
  });
}
