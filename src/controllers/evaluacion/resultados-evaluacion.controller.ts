import type {
  Request,
  Response,
} from "express";

import { servicioEstadoProvisionalResultados } from "../../services/evaluacion/estado-provisional-resultados.service";
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

const SIN_PROVISIONALES = {
  total: 0,
  aprobacionGestion: 0,
  noAplica: 0,
  revisionTecnica: 0,
};

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
      const grupo = obtenerGrupo(req);
      const usuario = obtenerUsuarioSesion(req);

      const resultado =
        await servicioResultadosEvaluacion.obtener(
          empresaId,
          anio,
          grupo,
          usuario
        );

      const provisionales =
        await servicioEstadoProvisionalResultados.obtener(
          empresaId,
          anio,
          grupo
        );

      res.status(200).json({
        ...resultado,
        resumenEmpresa: resultado.resumenEmpresa
          ? {
              ...resultado.resumenEmpresa,
              provisionales:
                provisionales.resumenEmpresa,
            }
          : null,
        estandares: resultado.estandares.map(
          (estandar) => ({
            ...estandar,
            provisionales:
              provisionales.estandares.get(estandar.id) ??
              SIN_PROVISIONALES,
          })
        ),
      });
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
