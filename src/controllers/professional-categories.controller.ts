import { Request, Response } from "express";
import {
  CodigoCategoriaGestion,
  EstadoRegistro,
} from "@prisma/client";

import { prisma } from "../lib/prisma";

function normalizarCodigos(value: unknown): CodigoCategoriaGestion[] {
  if (!Array.isArray(value)) {
    throw new Error("Debes enviar categoriasGestion como un arreglo.");
  }

  const disponibles = new Set(
    Object.values(CodigoCategoriaGestion)
  );
  const codigos = value.map((item) => String(item).trim());

  const invalidos = codigos.filter(
    (codigo) => !disponibles.has(codigo as CodigoCategoriaGestion)
  );

  if (invalidos.length > 0) {
    throw new Error(
      `Categorías de gestión no válidas: ${invalidos.join(", ")}.`
    );
  }

  return Array.from(
    new Set(codigos as CodigoCategoriaGestion[])
  );
}

async function obtenerAsignacion(
  profesionalId: string,
  empresaId: string
) {
  return prisma.empresaProfesional.findFirst({
    where: {
      profesionalId,
      empresaId,
      activo: true,
    },
    select: {
      id: true,
      profesionalId: true,
      empresaId: true,
      rolAsignacion: true,
      activo: true,
      profesional: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          correo: true,
        },
      },
      empresa: {
        select: {
          id: true,
          nombre: true,
          nit: true,
        },
      },
      categoriasGestion: {
        select: {
          categoriaGestion: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
        },
      },
    },
  });
}

function serializarAsignacion(
  asignacion: NonNullable<Awaited<ReturnType<typeof obtenerAsignacion>>>
) {
  const categoriasGestion = asignacion.categoriasGestion
    .map(({ categoriaGestion }) => categoriaGestion)
    .sort((a, b) => a.id - b.id);

  return {
    asignacionId: asignacion.id,
    profesionalId: asignacion.profesionalId,
    empresaId: asignacion.empresaId,
    rolAsignacion: asignacion.rolAsignacion,
    activo: asignacion.activo,
    profesional: asignacion.profesional,
    empresa: asignacion.empresa,
    categoriasGestion,
    codigosCategoriasGestion: categoriasGestion.map(
      ({ codigo }) => codigo
    ),
    modoAcceso:
      categoriasGestion.length === 0
        ? "GENERAL_COMPATIBILIDAD"
        : "RESTRINGIDO_POR_CATEGORIAS",
  };
}

export const controladorCategoriasProfesionalEmpresa = {
  obtener: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const profesionalId = String(req.params.id);
      const empresaId = String(req.params.empresaId);

      const asignacion = await obtenerAsignacion(
        profesionalId,
        empresaId
      );

      if (!asignacion) {
        res.status(404).json({
          error:
            "No existe una asignación activa entre el profesional y la empresa.",
          code: "ASIGNACION_PROFESIONAL_EMPRESA_NO_ENCONTRADA",
        });
        return;
      }

      res.json(serializarAsignacion(asignacion));
    } catch (error) {
      console.error(
        "[PROFESIONAL-CATEGORIAS-OBTENER]",
        error
      );

      res.status(500).json({
        error:
          "Error al consultar las categorías de gestión del profesional.",
      });
    }
  },

  actualizar: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const profesionalId = String(req.params.id);
      const empresaId = String(req.params.empresaId);

      let codigos: CodigoCategoriaGestion[];

      try {
        codigos = normalizarCodigos(
          req.body.categoriasGestion ?? req.body.categories
        );
      } catch (error) {
        res.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : "Las categorías de gestión no son válidas.",
          code: "CATEGORIAS_GESTION_INVALIDAS",
        });
        return;
      }

      const asignacion = await obtenerAsignacion(
        profesionalId,
        empresaId
      );

      if (!asignacion) {
        res.status(404).json({
          error:
            "No existe una asignación activa entre el profesional y la empresa.",
          code: "ASIGNACION_PROFESIONAL_EMPRESA_NO_ENCONTRADA",
        });
        return;
      }

      const categorias =
        codigos.length === 0
          ? []
          : await prisma.categoriaGestion.findMany({
              where: {
                codigo: {
                  in: codigos,
                },
                estado: EstadoRegistro.ACTIVO,
              },
              select: {
                id: true,
                codigo: true,
              },
            });

      if (categorias.length !== codigos.length) {
        res.status(409).json({
          error:
            "Una o más categorías solicitadas no están disponibles actualmente.",
          code: "CATEGORIA_GESTION_NO_DISPONIBLE",
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.empresaProfesionalCategoriaGestion.deleteMany({
          where: {
            empresaProfesionalId: asignacion.id,
          },
        });

        if (categorias.length > 0) {
          await tx.empresaProfesionalCategoriaGestion.createMany({
            data: categorias.map(({ id }) => ({
              empresaProfesionalId: asignacion.id,
              categoriaGestionId: id,
            })),
          });
        }
      });

      const actualizada = await obtenerAsignacion(
        profesionalId,
        empresaId
      );

      if (!actualizada) {
        res.status(409).json({
          error:
            "La asignación dejó de estar disponible durante la actualización.",
          code: "ASIGNACION_PROFESIONAL_EMPRESA_NO_DISPONIBLE",
        });
        return;
      }

      res.json({
        mensaje:
          codigos.length === 0
            ? "Categorías retiradas. La asignación conserva acceso general por compatibilidad histórica."
            : "Categorías de gestión actualizadas correctamente.",
        ...serializarAsignacion(actualizada),
      });
    } catch (error) {
      console.error(
        "[PROFESIONAL-CATEGORIAS-ACTUALIZAR]",
        error
      );

      res.status(500).json({
        error:
          "Error al actualizar las categorías de gestión del profesional.",
      });
    }
  },
};
