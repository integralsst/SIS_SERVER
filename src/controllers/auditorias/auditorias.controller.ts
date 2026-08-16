import type { Request, Response } from "express";
import {
  EstadoAuditoriaSgsst,
  EstadoHallazgoAuditoria,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  obtenerParametroRuta,
  obtenerUsuarioSesion,
  responderErrorEvaluacion,
} from "../evaluacion/shared/evaluacion-controller.utils";
import { servicioAuditorias } from "../../services/auditorias/auditorias.service";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import {
  normalizarActualizarAuditoria,
  normalizarActualizarHallazgo,
  normalizarActualizarRecomendacion,
  normalizarCambiarEstadoAuditoria,
  normalizarConsultaAuditorias,
  normalizarCrearAuditoria,
  normalizarCrearHallazgo,
  normalizarCrearRecomendacion,
  normalizarCrearSeguimiento,
} from "../../validators/auditorias.validator";

const ROLES_GOBIERNO_AUDITORIA: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

function esGobiernoAuditoria(rol: RolUsuario): boolean {
  return ROLES_GOBIERNO_AUDITORIA.includes(rol);
}

function asegurarGobiernoAuditoria(rol: RolUsuario): void {
  if (!esGobiernoAuditoria(rol)) {
    throw new ErrorEvaluacion(
      "Tu rol puede participar en la gestión y seguimiento de la auditoría, pero no iniciar, finalizar ni cancelar su estado global.",
      403,
      "AUDITORIA_GOBIERNO_REQUERIDO"
    );
  }
}

function asegurarAuditoriaEnEjecucion(estado: EstadoAuditoriaSgsst): void {
  if (estado !== EstadoAuditoriaSgsst.EN_EJECUCION) {
    throw new ErrorEvaluacion(
      "La auditoría debe estar en ejecución para registrar hallazgos. Iníciala formalmente antes de documentar resultados.",
      409,
      "AUDITORIA_NO_EN_EJECUCION"
    );
  }
}

function contarHallazgosPendientes(
  auditoria: Awaited<ReturnType<typeof servicioAuditorias.obtenerDetalle>>
): number {
  return auditoria.hallazgos.filter(
    (item) =>
      item.estado === EstadoHallazgoAuditoria.ABIERTO ||
      item.estado === EstadoHallazgoAuditoria.EN_GESTION
  ).length;
}

async function obtenerEstadoHallazgoGobernado(hallazgoId: string) {
  const hallazgo = await prisma.hallazgoAuditoria.findUnique({
    where: { id: hallazgoId },
    select: {
      estado: true,
      recomendaciones: {
        select: {
          id: true,
          estado: true,
        },
      },
    },
  });

  if (!hallazgo) {
    throw new ErrorEvaluacion(
      "El hallazgo seleccionado no existe.",
      404,
      "HALLAZGO_AUDITORIA_NO_ENCONTRADO"
    );
  }

  return hallazgo;
}

function hallazgoEstaResuelto(
  estado: EstadoHallazgoAuditoria
): boolean {
  return (
    estado === EstadoHallazgoAuditoria.RESUELTO ||
    estado === EstadoHallazgoAuditoria.CERRADO
  );
}

function asegurarEdicionEstructuralHallazgo(
  estado: EstadoHallazgoAuditoria,
  rol: RolUsuario
): void {
  if (hallazgoEstaResuelto(estado) && !esGobiernoAuditoria(rol)) {
    throw new ErrorEvaluacion(
      "El hallazgo ya está resuelto. Tu rol conserva acceso de consulta y seguimiento, pero la asignación y el plazo quedan bajo gobierno de coordinación o administración.",
      403,
      "HALLAZGO_RESUELTO_GOBIERNO_REQUERIDO"
    );
  }
}

function asegurarNuevaRecomendacionPermitida(
  estado: EstadoHallazgoAuditoria
): void {
  if (hallazgoEstaResuelto(estado)) {
    throw new ErrorEvaluacion(
      "El hallazgo ya está resuelto. Para registrar una nueva recomendación debe reabrirse formalmente mediante seguimiento por un rol de gobierno.",
      409,
      "HALLAZGO_RESUELTO_NUEVA_RECOMENDACION"
    );
  }
}

function asegurarSeguimientoProfesionalResuelto(
  hallazgo: Awaited<ReturnType<typeof obtenerEstadoHallazgoGobernado>>,
  data: ReturnType<typeof normalizarCrearSeguimiento>,
  rol: RolUsuario
): void {
  if (!hallazgoEstaResuelto(hallazgo.estado) || esGobiernoAuditoria(rol)) {
    return;
  }

  if (hallazgo.estado === EstadoHallazgoAuditoria.CERRADO) {
    throw new ErrorEvaluacion(
      "El hallazgo está cerrado. Los seguimientos posteriores requieren intervención de coordinación o administración.",
      403,
      "HALLAZGO_CERRADO_GOBIERNO_REQUERIDO"
    );
  }

  if (
    data.estadoHallazgo &&
    data.estadoHallazgo !== EstadoHallazgoAuditoria.RESUELTO
  ) {
    throw new ErrorEvaluacion(
      "Como profesional puedes documentar seguimiento posterior sobre un hallazgo resuelto, pero no reabrirlo ni cambiar su estado. Solicita la intervención de coordinación o administración.",
      403,
      "HALLAZGO_RESUELTO_REAPERTURA_GOBIERNO"
    );
  }

  if (data.estadoRecomendacion) {
    const recomendacion = data.recomendacionId
      ? hallazgo.recomendaciones.find(
          (item) => item.id === data.recomendacionId
        )
      : null;

    if (
      recomendacion &&
      data.estadoRecomendacion !== recomendacion.estado
    ) {
      throw new ErrorEvaluacion(
        "Como profesional puedes agregar trazabilidad posterior, pero no cambiar el estado de una recomendación cuando el hallazgo ya está resuelto.",
        403,
        "RECOMENDACION_RESUELTA_GOBIERNO_REQUERIDO"
      );
    }
  }
}

function queryRecord(req: Request): Record<string, unknown> {
  return req.query as Record<string, unknown>;
}

function bodyRecord(req: Request): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

export const controladorAuditorias = {
  listar: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.listar(
        obtenerUsuarioSesion(req),
        normalizarConsultaAuditorias(queryRecord(req))
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  obtenerDetalle: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.obtenerDetalle(
        obtenerParametroRuta(req, "auditoriaId"),
        obtenerUsuarioSesion(req)
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  crear: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.crear(
        normalizarCrearAuditoria(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  actualizar: async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.actualizar(
        obtenerParametroRuta(req, "auditoriaId"),
        normalizarActualizarAuditoria(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  cambiarEstado: async (req: Request, res: Response): Promise<void> => {
    try {
      const usuario = obtenerUsuarioSesion(req);
      asegurarGobiernoAuditoria(usuario.rol);

      const auditoriaId = obtenerParametroRuta(req, "auditoriaId");
      const data = normalizarCambiarEstadoAuditoria(bodyRecord(req));

      if (data.estado === EstadoAuditoriaSgsst.FINALIZADA) {
        const auditoria = await servicioAuditorias.obtenerDetalle(
          auditoriaId,
          usuario
        );
        const pendientes = contarHallazgosPendientes(auditoria);

        if (pendientes > 0) {
          throw new ErrorEvaluacion(
            `No puedes finalizar la auditoría mientras existan ${pendientes} hallazgo(s) operativo(s) pendiente(s). Resuélvelos o ciérralos antes de formalizar el cierre.`,
            409,
            "AUDITORIA_HALLAZGOS_PENDIENTES"
          );
        }
      }

      const resultado = await servicioAuditorias.cambiarEstado(
        auditoriaId,
        data,
        usuario
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  crearHallazgo: async (req: Request, res: Response): Promise<void> => {
    try {
      const usuario = obtenerUsuarioSesion(req);
      const auditoriaId = obtenerParametroRuta(req, "auditoriaId");
      const auditoria = await servicioAuditorias.obtenerDetalle(
        auditoriaId,
        usuario
      );
      asegurarAuditoriaEnEjecucion(auditoria.estado);

      const resultado = await servicioAuditorias.crearHallazgo(
        auditoriaId,
        normalizarCrearHallazgo(bodyRecord(req)),
        usuario
      );
      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  actualizarHallazgo: async (req: Request, res: Response): Promise<void> => {
    try {
      const usuario = obtenerUsuarioSesion(req);
      const hallazgoId = obtenerParametroRuta(req, "hallazgoId");
      const hallazgo = await obtenerEstadoHallazgoGobernado(hallazgoId);
      asegurarEdicionEstructuralHallazgo(hallazgo.estado, usuario.rol);

      const resultado = await servicioAuditorias.actualizarHallazgo(
        hallazgoId,
        normalizarActualizarHallazgo(bodyRecord(req)),
        usuario
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  crearRecomendacion: async (req: Request, res: Response): Promise<void> => {
    try {
      const hallazgoId = obtenerParametroRuta(req, "hallazgoId");
      const hallazgo = await obtenerEstadoHallazgoGobernado(hallazgoId);
      asegurarNuevaRecomendacionPermitida(hallazgo.estado);

      const resultado = await servicioAuditorias.crearRecomendacion(
        hallazgoId,
        normalizarCrearRecomendacion(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  actualizarRecomendacion: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const resultado = await servicioAuditorias.actualizarRecomendacion(
        obtenerParametroRuta(req, "recomendacionId"),
        normalizarActualizarRecomendacion(bodyRecord(req)),
        obtenerUsuarioSesion(req)
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  registrarSeguimiento: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const usuario = obtenerUsuarioSesion(req);
      const hallazgoId = obtenerParametroRuta(req, "hallazgoId");
      const data = normalizarCrearSeguimiento(bodyRecord(req));
      const hallazgo = await obtenerEstadoHallazgoGobernado(hallazgoId);
      asegurarSeguimientoProfesionalResuelto(hallazgo, data, usuario.rol);

      const resultado = await servicioAuditorias.registrarSeguimiento(
        hallazgoId,
        data,
        usuario
      );
      res.status(201).json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },

  contextoEmpresa: async (req: Request, res: Response): Promise<void> => {
    try {
      const anioRaw = req.query.anio;
      const anio = anioRaw === undefined ? undefined : Number(anioRaw);
      if (
        anio !== undefined &&
        (!Number.isInteger(anio) || anio < 2000 || anio > 9999)
      ) {
        res.status(400).json({ error: "El año consultado no es válido." });
        return;
      }

      const resultado = await servicioAuditorias.obtenerContextoEmpresa(
        obtenerParametroRuta(req, "empresaId"),
        anio,
        obtenerUsuarioSesion(req)
      );
      res.json(resultado);
    } catch (error) {
      responderErrorEvaluacion(error, res);
    }
  },
};
