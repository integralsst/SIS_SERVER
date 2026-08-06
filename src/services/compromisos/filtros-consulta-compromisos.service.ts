import {
  EstadoAsignacionCompromiso,
  Prisma,
} from "@prisma/client";

import type {
  ConsultaCompromisosInput,
} from "../../types/compromisos/consulta-compromisos.types";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { construirAccesoListadoCompromisos } from "./acceso-compromisos.service";
import { ESTADOS_COMPROMISO_ABIERTOS } from "./fechas-compromiso.service";

export function construirFiltrosBaseCompromisos(
  consulta: ConsultaCompromisosInput,
  usuario: UsuarioSesionEvaluacion
): Prisma.CompromisoWhereInput {
  const filtros: Prisma.CompromisoWhereInput[] = [
    construirAccesoListadoCompromisos(
      usuario,
      consulta.alcance
    ),
  ];

  if (consulta.empresaId) {
    filtros.push({
      empresaId: consulta.empresaId,
    });
  }

  if (consulta.empresa) {
    filtros.push({
      empresa: {
        OR: [
          {
            nombre: {
              contains: consulta.empresa,
            },
          },
          {
            nit: {
              contains: consulta.empresa,
            },
          },
        ],
      },
    });
  }

  if (consulta.responsableId) {
    filtros.push({
      responsables: {
        some: {
          usuarioResponsableId:
            consulta.responsableId,
          estado:
            EstadoAsignacionCompromiso.ASIGNADA,
        },
      },
    });
  }

  if (consulta.responsable) {
    filtros.push({
      responsables: {
        some: {
          estado:
            EstadoAsignacionCompromiso.ASIGNADA,
          usuarioResponsable: {
            OR: [
              {
                nombre: {
                  contains:
                    consulta.responsable,
                },
              },
              {
                correo: {
                  contains:
                    consulta.responsable,
                },
              },
            ],
          },
        },
      },
    });
  }

  if (consulta.aspecto) {
    filtros.push({
      aspecto: {
        OR: [
          {
            nombre: {
              contains: consulta.aspecto,
            },
          },
          {
            codigo: {
              contains: consulta.aspecto,
            },
          },
        ],
      },
    });
  }

  if (consulta.proceso) {
    filtros.push({
      evaluacionOrigen: {
        supermatrizTarea: {
          proceso: {
            nombre: {
              contains: consulta.proceso,
            },
          },
        },
      },
    });
  }

  if (consulta.busqueda) {
    filtros.push({
      OR: [
        {
          descripcion: {
            contains: consulta.busqueda,
          },
        },
        {
          aspectoCodigo: {
            contains: consulta.busqueda,
          },
        },
        {
          aspecto: {
            nombre: {
              contains: consulta.busqueda,
            },
          },
        },
        {
          empresa: {
            nombre: {
              contains: consulta.busqueda,
            },
          },
        },
        {
          empresa: {
            nit: {
              contains: consulta.busqueda,
            },
          },
        },
        {
          evaluacionOrigen: {
            supermatrizTarea: {
              proceso: {
                nombre: {
                  contains: consulta.busqueda,
                },
              },
            },
          },
        },
      ],
    });
  }

  return {
    AND: filtros,
  };
}

export function construirFiltroEstadoCompromiso(
  consulta: ConsultaCompromisosInput
): Prisma.CompromisoWhereInput {
  if (consulta.estado === "ABIERTOS") {
    return {
      estado: {
        in: ESTADOS_COMPROMISO_ABIERTOS,
      },
    };
  }

  if (consulta.estado) {
    return {
      estado: consulta.estado,
    };
  }

  return {};
}
