import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { servicioAlertasCompromisos } from "../compromisos/alertas-compromisos.service";
import {
  servicioAlertasControlEvaluacion,
  type AlertaControlEvaluacion,
} from "../evaluacion/alertas-control-evaluacion.service";
import { servicioAlertasRevisionesTecnicas } from "../evaluacion/revisiones/alertas-revisiones-tecnicas.service";

type NivelAlerta = "ALTA" | "MEDIA" | "BAJA";

type AlertaCentro = AlertaControlEvaluacion;

function prioridad(nivel: NivelAlerta): number {
  if (nivel === "ALTA") return 1;
  if (nivel === "MEDIA") return 2;
  return 3;
}

export const servicioCentroAcciones = {
  listar: async (usuario: UsuarioSesionEvaluacion) => {
    const [
      compromisos,
      controlesEvaluacion,
      revisionesTecnicas,
    ] = await Promise.all([
      servicioAlertasCompromisos.listar(usuario),
      servicioAlertasControlEvaluacion.listar(usuario),
      servicioAlertasRevisionesTecnicas.listar(usuario),
    ]);

    const alertas = [
      ...(compromisos.alertas as AlertaCentro[]),
      ...controlesEvaluacion,
      ...revisionesTecnicas,
    ].sort((a, b) => {
      const nivel =
        prioridad(a.nivel) - prioridad(b.nivel);

      if (nivel !== 0) return nivel;

      return a.fechaLimite.localeCompare(b.fechaLimite);
    });

    const alertasControl = [
      ...controlesEvaluacion,
      ...revisionesTecnicas,
    ];

    return {
      resumen: {
        total:
          compromisos.resumen.total +
          alertasControl.length,
        urgentes:
          compromisos.resumen.urgentes +
          alertasControl.filter(
            (alerta) => alerta.nivel === "ALTA"
          ).length,
      },
      alertas: alertas.slice(0, 12),
      generadasEn: new Date().toISOString(),
    };
  },
};
