import {
  EstadoCompromiso,
  Prisma,
} from "@prisma/client";

import type {
  FiltroVencimientoCompromiso,
} from "../../types/compromisos/consulta-compromisos.types";

export const ESTADOS_COMPROMISO_ABIERTOS: EstadoCompromiso[] = [
  EstadoCompromiso.EN_EJECUCION,
  EstadoCompromiso.PENDIENTE_DE_REASIGNACION,
  EstadoCompromiso.SOLICITUD_DE_CIERRE,
];

export function obtenerVentanaVencimiento() {
  const hoy = new Date();

  hoy.setUTCHours(0, 0, 0, 0);

  const limiteProximo = new Date(hoy);

  limiteProximo.setUTCDate(
    limiteProximo.getUTCDate() + 30
  );

  return {
    hoy,
    limiteProximo,
  };
}

export function construirFiltroVencimiento(
  valor: FiltroVencimientoCompromiso,
  hoy: Date,
  limiteProximo: Date
): Prisma.CompromisoWhereInput {
  switch (valor) {
    case "VENCIDOS":
      return {
        estado: {
          in: ESTADOS_COMPROMISO_ABIERTOS,
        },
        fechaLimite: {
          lt: hoy,
        },
      };

    case "PROXIMOS_30_DIAS":
      return {
        estado: {
          in: ESTADOS_COMPROMISO_ABIERTOS,
        },
        fechaLimite: {
          gte: hoy,
          lte: limiteProximo,
        },
      };

    case "VIGENTES":
      return {
        estado: {
          in: ESTADOS_COMPROMISO_ABIERTOS,
        },
        fechaLimite: {
          gt: limiteProximo,
        },
      };

    case "CERRADOS":
      return {
        estado: {
          in: [
            EstadoCompromiso.CUMPLIDO,
            EstadoCompromiso.CANCELADO,
          ],
        },
      };

    default:
      return {};
  }
}

export function calcularSemaforoCompromiso(
  estado: EstadoCompromiso,
  fechaLimite: Date,
  hoy: Date,
  limiteProximo: Date
):
  | "VENCIDO"
  | "PROXIMO_A_VENCER"
  | "VIGENTE"
  | "CERRADO" {
  if (
    !ESTADOS_COMPROMISO_ABIERTOS.includes(
      estado
    )
  ) {
    return "CERRADO";
  }

  if (fechaLimite < hoy) {
    return "VENCIDO";
  }

  if (fechaLimite <= limiteProximo) {
    return "PROXIMO_A_VENCER";
  }

  return "VIGENTE";
}
