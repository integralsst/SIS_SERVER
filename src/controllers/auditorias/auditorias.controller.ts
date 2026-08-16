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
      auditoria: {
        select: {
          estado: true,
        },
      },
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

async function obtenerEstadoRecomendacionGobernada(recomendacionId: string) {
  const recomendacion = await prisma.recomendacionAuditoria.findUnique({
    where: { id: recomendacionId },
    select: {
      id: true,
      estado: true,
      hallazgo: {
        select: {
          estado: true,
          auditoria: {
            select: {
              estado: true,
            },
          },
        },
      },
    },
  });

  if (!recomendacion) {
    throw new ErrorEvaluacion(
      "La recomendación seleccionada no existe.",
      404,
      "RECOMENDACION_AUDITORIA_NO_ENCONTRADA"
    );
  }

  return recomendacion;
}

function hallazgoEstaResuelto(
  estado: EstadoHallazgoAuditoria
): boolean {
  return (
    estado === EstadoHallazgoAuditoria.RESUELTO ||
    estado === EstadoHallazgoAuditoria.CERRADO
  );
}

function asegurarRegistroHistoricoEditable(hallazgo: {
  estado: EstadoHallazgoAuditoria;
  auditoria: { estado: EstadoAuditoriaSgsst };
}): void {
  if (hallazgo.auditoria.estado === EstadoAuditoriaSgsst.FINALIZADA) {
    throw new ErrorEvaluacion(
      "La auditoría ya fue finalizada. El hallazgo forma parte del registro histórico y su clasificación, asignación y plazo ya no pueden modificarse.",
      409,
      "AUDITORIA_HISTORICA_BLOQUEADA"
    );
  }

  if (hallazgoEstaResuelto(hallazgo.estado)) {
    throw new ErrorEvaluacion(
      "El hallazgo ya está resuelto. Su clasificación, asignación y plazo quedan protegidos como parte de la trazabilidad histórica.",
      409,
      "HALLAZGO_HISTORICO_BLOQUEADO"
    );
  }
}

function asegurarNuevaRecomendacionPermitida(hallazgo: {
  estado: EstadoHallazgoAuditoria;
  auditoria: { estado: EstadoAuditoriaSgsst };
}): void {
  if (hallazgo.auditoria.estado === EstadoAuditoriaSgsst.FINALIZADA) {
    throw new ErrorEvaluacion(
      "La auditoría ya fue finalizada. No se pueden agregar nuevas recomendaciones al registro histórico.",
      409,
      "AUDITORIA_HISTORICA_NUEVA_RECOMENDACION"
    );
  }

  if (hallazgoEstaResuelto(hallazgo.estado)) {
    throw new ErrorEvaluacion(
      "El hallazgo ya está resuelto. No se pueden agregar nuevas recomendaciones; conserva su trazabilidad mediante seguimientos informativos.",
      409,
      "HALLAZGO_RESUELTO_NUEVA_RECOMENDACION"
    );
  }
}

function asegurarRecomendacionEditable(recomendacion: Awaited<
  ReturnType<typeof obtenerEstadoRecomendacionGobernada>
>): void {
  if (recomendacion.hallazgo.auditoria.estado === EstadoAuditoriaSgsst.FINALIZADA) {
    throw new ErrorEvaluacion(
      "La auditoría ya fue finalizada. La recomendación forma parte del registro histórico y no puede modificarse.",
      409,
      "RECOMENDACION_AUDITORIA_HISTORICA_BLOQUEADA"
    );
  }

  if (hallazgoEstaResuelto(recomendacion.hallazgo.estado)) {
    throw new ErrorEvaluacion(
      "El hallazgo ya está resuelto. La recomendación queda protegida como parte de la trazabilidad histórica.",
      409,
      "RECOMENDACION_HISTORICA_BLOQUEADA"
    );
  }
}

function asegurarSeguimientoHistoricoInformativo(
  hallazgo: Awaited<ReturnType<typeof obtenerEstadoHallazgoGobernado>>,
  data: ReturnType<typeof normalizarCrearSeguimiento>
): void {
  const historico =
    hallazgo.auditoria.estado === EstadoAuditoriaSgsst.FINALIZADA ||
    hallazgoEstaResuelto(hallazgo.estado);

  if (!historico) return;

  if (data.estadoHallazgo || data.estadoRecomendacion) {
    throw new ErrorEvaluacion(
      "El hallazgo ya forma parte del registro histórico. Puedes agregar un seguimiento informativo, pero no reabrir ni cambiar estados del hallazgo o sus recomendaciones.",
      409,
      "SEGUIMIENTO_HISTORICO_SOLO_INFORMATIVO"
    );
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
      asegurarRegistroHistoricoEditable(hallazgo);

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
      asegurarNuevaRecomendacionPermitida(hallazgo);

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
      const recomendacionId = obtenerParametroRuta(req, "recomendacionId");
      const recomendacion = await obtenerEstadoRecomendacionGobernada(
        recomendacionId
      );
      asegurarRecomendacionEditable(recomendacion);

      const resultado = await servicioAuditorias.actualizarRecomendacion(
        recomendacionId,
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
      asegurarSeguimientoHistoricoInformativo(hallazgo, data);

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
