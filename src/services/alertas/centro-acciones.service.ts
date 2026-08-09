import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { servicioAlertasCompromisos } from "../compromisos/alertas-compromisos.service";
import {
  servicioAlertasControlEvaluacion,
  type AlertaControlEvaluacion,
} from "../evaluacion/alertas-control-evaluacion.service";

type NivelAlerta = "ALTA" | "MEDIA" | "BAJA";

type AlertaCentro = AlertaControlEvaluacion;

function prioridad(nivel: NivelAlerta): number {
  if (nivel === "ALTA") return 1;
  if (nivel === "MEDIA") return 2;
  return 3;
}

export const servicioCentroAcciones = {
  listar: async (usuario: UsuarioSesionEvaluacion) => {
    const [compromisos, controlesEvaluacion] =
      await Promise.all([
        servicioAlertasCompromisos.listar(usuario),
        servicioAlertasControlEvaluacion.listar(usuario),
      ]);

    const alertas = [
      ...(compromisos.alertas as AlertaCentro[]),
      ...controlesEvaluacion,
    ].sort((a, b) => {
      const nivel =
        prioridad(a.nivel) - prioridad(b.nivel);

      if (nivel !== 0) return nivel;

      return a.fechaLimite.localeCompare(b.fechaLimite);
    });

    return {
      resumen: {
        total:
          compromisos.resumen.total +
          controlesEvaluacion.length,
        urgentes:
          compromisos.resumen.urgentes +
          controlesEvaluacion.filter(
            (alerta) => alerta.nivel === "ALTA"
          ).length,
      },
      alertas: alertas.slice(0, 12),
      generadasEn: new Date().toISOString(),
    };
  },
};
