import type {
  Request,
  Response,
} from "express";

import {
  FILTROS_GRUPO_RESULTADOS,
  servicioResultadosEvaluacion,
  type FiltroGrupoResultados,
} from "../../services/evaluacion/resultados-evaluacion.service";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

function obtenerGrupo(req: Request): FiltroGrupoResultados {
  const valor = Array.isArray(req.query.grupo)
    ? req.query.grupo[0]
    : req.query.grupo;
  const grupo =
    typeof valor === "string" && valor.length > 0
      ? valor
      : "TODOS";

  if (
    !FILTROS_GRUPO_RESULTADOS.includes(
      grupo as FiltroGrupoResultados
    )
  ) {
    throw new ErrorEvaluacion(
      "El grupo de estándares solicitado no es válido.",
      400,
      "GRUPO_RESULTADOS_INVALIDO"
    );
  }

  return grupo as FiltroGrupoResultados;
}

export const controladorResultadosEvaluacion = {
  obtener: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const empresaId = obtenerParametroRuta(
        req,
        "empresaId"
      );
      const anioSolicitado = Array.isArray(req.query.anio)
        ? req.query.anio[0]
        : req.query.anio;
      const anio =
        typeof anioSolicitado === "string"
          ? Number(anioSolicitado)
          : new Date().getFullYear();

      const resultado =
        await servicioResultadosEvaluacion.obtener(
          empresaId,
          anio,
          obtenerGrupo(req),
          obtenerUsuarioSesion(req)
        );

      res.status(200).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
