import type { Request, Response } from "express";

import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import { ErrorValidacionBitacora } from "../../validators/bitacora/bitacora.validator";
import { ErrorOpenRouter } from "../../services/bitacora/ia/openrouter.client";

export function obtenerUsuarioSesionBitacora(
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

export function obtenerParametroBitacora(
  req: Request,
  nombre: string
): string {
  const valor = req.params[nombre];

  if (typeof valor === "string" && valor.trim()) {
    return valor.trim();
  }

  if (Array.isArray(valor)) {
    const primero = valor[0];
    if (typeof primero === "string" && primero.trim()) {
      return primero.trim();
    }
  }

  throw new ErrorValidacionBitacora(
    `El parámetro de ruta "${nombre}" es obligatorio.`,
    400,
    "BITACORA_PARAMETRO_INVALIDO"
  );
}

export function responderErrorBitacora(
  error: unknown,
  res: Response
): void {
  console.error("[MODULO-BITACORA]", error);

  if (error instanceof ErrorValidacionBitacora) {
    res.status(error.status).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  if (error instanceof ErrorOpenRouter) {
    res.status(error.status).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  if (error instanceof ErrorEvaluacion) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
    return;
  }

  res.status(500).json({
    error: "Ocurrió un error interno en el módulo de Bitácora.",
  });
}
