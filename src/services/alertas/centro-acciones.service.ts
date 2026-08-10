import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  servicioAlertasCompromisos,
  type AlertaCompromiso,
} from "../compromisos/alertas-compromisos.service";
import { listarEmpresasAccesibles, asegurarEmpresaAccesible } from "../empresas/acceso-empresas.service";
import {
  servicioAlertasControlEvaluacion,
  type AlertaControlEvaluacion,
} from "../evaluacion/alertas-control-evaluacion.service";
import { servicioAlertasRevisionesTecnicas } from "../evaluacion/revisiones/alertas-revisiones-tecnicas.service";

type NivelAlerta = "ALTA" | "MEDIA" | "BAJA";
type AlertaCentro = AlertaControlEvaluacion | AlertaCompromiso;

interface OpcionesCentroAcciones {
  empresaId?: string;
  completa?: boolean;
}

function prioridad(nivel: NivelAlerta): number {
  if (nivel === "ALTA") return 1;
  if (nivel === "MEDIA") return 2;
  return 3;
}

function ordenar(alertas: AlertaCentro[]): AlertaCentro[] {
  return alertas.sort((a, b) => {
    const nivel = prioridad(a.nivel) - prioridad(b.nivel);

    if (nivel !== 0) return nivel;

    return a.fechaLimite.localeCompare(b.fechaLimite);
  });
}

async function cargar(
  usuario: UsuarioSesionEvaluacion,
  opciones: OpcionesCentroAcciones
) {
  const limiteConsulta = opciones.completa ? null : undefined;

  const empresas = opciones.empresaId
    ? [await asegurarEmpresaAccesible(usuario, opciones.empresaId)]
    : await listarEmpresasAccesibles(usuario);
  const empresasPermitidas = new Set(empresas.map((empresa) => empresa.id));

  const [compromisos, controlesEvaluacion, revisionesTecnicas] =
    await Promise.all([
      servicioAlertasCompromisos.listar(usuario, {
        empresaId: opciones.empresaId,
        limiteConsulta,
        limiteRespuesta: opciones.completa ? null : undefined,
      }),
      servicioAlertasControlEvaluacion.listar(usuario, {
        empresaId: opciones.empresaId,
        limiteConsulta,
      }),
      servicioAlertasRevisionesTecnicas.listar(usuario, {
        empresaId: opciones.empresaId,
        limiteConsulta,
      }),
    ]);

  const alertasCompromisos = compromisos.alertas.filter((alerta) =>
    empresasPermitidas.has(alerta.empresa.id)
  );
  const alertasControl = [
    ...controlesEvaluacion,
    ...revisionesTecnicas,
  ].filter((alerta) => empresasPermitidas.has(alerta.empresa.id));

  return {
    compromisos,
    alertasCompromisos,
    alertasControl,
    alertas: ordenar([
      ...alertasCompromisos,
      ...alertasControl,
    ]),
  };
}

export const servicioCentroAcciones = {
  listar: async (usuario: UsuarioSesionEvaluacion) => {
    const resultado = await cargar(usuario, { completa: false });

    return {
      resumen: {
        total:
          resultado.compromisos.resumen.total +
          resultado.alertasControl.length,
        urgentes:
          resultado.compromisos.resumen.urgentes +
          resultado.alertasControl.filter(
            (alerta) => alerta.nivel === "ALTA"
          ).length,
      },
      alertas: resultado.alertas.slice(0, 12),
      generadasEn: new Date().toISOString(),
    };
  },

  listarTodas: async (
    usuario: UsuarioSesionEvaluacion,
    empresaId?: string
  ): Promise<AlertaCentro[]> => {
    const resultado = await cargar(usuario, {
      completa: true,
      empresaId,
    });

    return resultado.alertas;
  },
};
