import type {
  Request,
  Response,
} from "express";

import { servicioMatrizEvaluacionOptimizada } from "../../services/evaluacion/matriz-evaluacion-optimizada.service";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

function registrarTiempoContexto(
  res: Response,
  inicio: bigint,
  empresaId: string,
  anio: number,
  resultado: "OK" | "ERROR"
): void {
  const duracionMs =
    Number(process.hrtime.bigint() - inicio) / 1_000_000;
  const duracionRedondeada = Number(duracionMs.toFixed(1));

  res.setHeader(
    "Server-Timing",
    `contexto-evaluacion;dur=${duracionRedondeada}`
  );
  res.setHeader(
    "X-Response-Time",
    `${duracionRedondeada}ms`
  );

  if (duracionMs >= 750) {
    console.info("[rendimiento] contexto-evaluacion", {
      empresaId,
      anio,
      resultado,
      duracionMs: duracionRedondeada,
    });
  }
}

export const controladorContextoEvaluacion = {
  obtener: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const inicio = process.hrtime.bigint();
    let empresaId = "desconocida";
    let anio = new Date().getFullYear();

    try {
      empresaId = obtenerParametroRuta(
        req,
        "empresaId"
      );

      const anioSolicitado = Array.isArray(req.query.anio)
        ? req.query.anio[0]
        : req.query.anio;

      anio =
        anioSolicitado != null &&
        typeof anioSolicitado === "string"
          ? Number(anioSolicitado)
          : new Date().getFullYear();

      const resultado =
        await servicioMatrizEvaluacionOptimizada.obtenerContexto(
          empresaId,
          anio,
          obtenerUsuarioSesion(req)
        );

      registrarTiempoContexto(
        res,
        inicio,
        empresaId,
        anio,
        "OK"
      );
      res.status(200).json(resultado);
    } catch (error) {
      registrarTiempoContexto(
        res,
        inicio,
        empresaId,
        anio,
        "ERROR"
      );
      responderErrorEvaluacion(error, res);
    }
  },
};
