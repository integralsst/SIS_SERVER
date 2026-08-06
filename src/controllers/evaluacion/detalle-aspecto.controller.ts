import type {
  Request,
  Response,
} from "express";

import { servicioDetalleAspectoRapido } from "../../services/evaluacion/detalle-aspecto-rapido.service";
import { servicioDetalleAspectoSecciones } from "../../services/evaluacion/detalle-aspecto-secciones.service";
import { servicioDetalleResumenDinamico } from "../../services/evaluacion/detalle-resumen-dinamico.service";
import { servicioDetalleAspecto } from "../../services/evaluacion/detalle-aspecto.service";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { validarAnio } from "../../utils/evaluacion";
import { finalizarMedicionHttp } from "../../utils/rendimiento";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "./shared/evaluacion-controller.utils";

interface ParametrosDetalle {
  empresaId: string;
  tareaId: number;
  anio: number;
  usuario: UsuarioSesionEvaluacion;
}

function obtenerParametrosDetalle(
  req: Request
): ParametrosDetalle {
  const empresaId = obtenerParametroRuta(
    req,
    "empresaId"
  );
  const tareaId = Number(
    obtenerParametroRuta(req, "tareaId")
  );
  const anioQuery = Array.isArray(req.query.anio)
    ? req.query.anio[0]
    : req.query.anio;
  const anio = Number(
    typeof anioQuery === "string"
      ? anioQuery
      : new Date().getFullYear()
  );

  if (!Number.isInteger(tareaId) || tareaId <= 0) {
    throw new Error(
      "El identificador de la fila no es válido."
    );
  }

  validarAnio(anio);

  return {
    empresaId,
    tareaId,
    anio,
    usuario: obtenerUsuarioSesion(req),
  };
}

function obtenerPagina(req: Request): number {
  const paginaQuery = Array.isArray(req.query.pagina)
    ? req.query.pagina[0]
    : req.query.pagina;
  const pagina = Number(
    typeof paginaQuery === "string"
      ? paginaQuery
      : 1
  );

  return Number.isInteger(pagina) && pagina > 0
    ? pagina
    : 1;
}

async function responderSeccion(
  req: Request,
  res: Response,
  nombre: string,
  cargar: (
    parametros: ParametrosDetalle
  ) => Promise<unknown>
): Promise<void> {
  const inicio = process.hrtime.bigint();
  let contexto: Record<string, unknown> = {};

  try {
    const parametros = obtenerParametrosDetalle(req);
    contexto = {
      empresaId: parametros.empresaId,
      tareaId: parametros.tareaId,
      anio: parametros.anio,
    };

    const resultado = await cargar(parametros);

    finalizarMedicionHttp(res, {
      nombre,
      inicio,
      resultado: "OK",
      contexto,
    });

    res.status(200).json(resultado);
  } catch (error) {
    finalizarMedicionHttp(res, {
      nombre,
      inicio,
      resultado: "ERROR",
      contexto,
    });

    responderErrorEvaluacion(error, res);
  }
}

export const controladorDetalleAspecto = {
  // Endpoint anterior conservado para compatibilidad durante el despliegue.
  obtener: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    await responderSeccion(
      req,
      res,
      "detalle-aspecto",
      ({ empresaId, tareaId, anio, usuario }) =>
        servicioDetalleAspecto.obtener(
          empresaId,
          tareaId,
          anio,
          usuario
        )
    );
  },

  obtenerResumen: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    await responderSeccion(
      req,
      res,
      "detalle-resumen",
      ({ empresaId, tareaId, anio, usuario }) =>
        servicioDetalleAspectoSecciones.obtenerResumen(
          empresaId,
          tareaId,
          anio,
          usuario
        )
    );
  },

  obtenerResumenRapido: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    await responderSeccion(
      req,
      res,
      "detalle-resumen-rapido",
      ({ empresaId, tareaId, anio, usuario }) =>
        servicioDetalleResumenDinamico.obtener(
          empresaId,
          tareaId,
          anio,
          usuario
        )
    );
  },

  obtenerConfiguracionResumen: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    await responderSeccion(
      req,
      res,
      "detalle-resumen-configuracion",
      ({ empresaId, tareaId, anio, usuario }) =>
        servicioDetalleAspectoRapido.obtenerConfiguracion(
          empresaId,
          tareaId,
          anio,
          usuario
        )
    );
  },

  obtenerHistorial: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    await responderSeccion(
      req,
      res,
      "detalle-historial",
      ({ empresaId, tareaId, anio, usuario }) =>
        servicioDetalleAspectoSecciones.obtenerHistorial(
          empresaId,
          tareaId,
          anio,
          usuario
        )
    );
  },

  obtenerHistorialPaginado: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const pagina = obtenerPagina(req);

    await responderSeccion(
      req,
      res,
      "detalle-historial-paginado",
      ({ empresaId, tareaId, anio, usuario }) =>
        servicioDetalleAspectoRapido.obtenerHistorialPaginado(
          empresaId,
          tareaId,
          anio,
          pagina,
          usuario
        )
    );
  },

  obtenerEvidencias: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    await responderSeccion(
      req,
      res,
      "detalle-evidencias",
      ({ empresaId, tareaId, anio, usuario }) =>
        servicioDetalleAspectoSecciones.obtenerEvidencias(
          empresaId,
          tareaId,
          anio,
          usuario
        )
    );
  },

  obtenerRevisionTecnica: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    await responderSeccion(
      req,
      res,
      "detalle-revision-tecnica",
      ({ empresaId, tareaId, anio, usuario }) =>
        servicioDetalleAspectoSecciones.obtenerRevisionTecnica(
          empresaId,
          tareaId,
          anio,
          usuario
        )
    );
  },
};
