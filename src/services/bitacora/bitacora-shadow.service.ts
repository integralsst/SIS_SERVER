import { randomUUID } from "node:crypto";

import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import type { CrearRegistroBitacoraInput } from "../../types/bitacora.types";
import { validarCrearRegistroBitacora } from "../../validators/bitacora/bitacora.validator";
import { servicioPeriodosEvaluacion } from "../evaluacion/periodos-evaluacion.service";
import { extraerUrlsBitacora } from "./bitacora-enlaces.service";
import { asegurarAccesoBitacoraEmpresa } from "./bitacora-permisos.service";
import { analizarRegistroBitacoraConIa } from "./ia/bitacora-ai.service";
import { buscarCandidatosAspectoBitacora } from "./recuperacion/candidatos-aspecto.service";
import { cargarContextoAspectosBitacora } from "./recuperacion/contexto-aspecto.service";

export interface ResultadoShadowBitacora {
  modo: "SHADOW";
  empresa: {
    id: string;
    nombre: string;
  };
  versionSupermatriz: {
    id: number;
    nombre: string;
  };
  registro: {
    idTemporal: string;
    fechaEfectiva: string;
    contenidoOriginal: string;
  };
  recuperacion: {
    totalCandidatos: number;
    aspectosCandidatos: Array<{
      aspectoId: number;
      identidadHistorica: string;
      codigo: string | null;
      nombre: string;
      puntajeRecuperacion: number;
    }>;
  };
  analisis: Awaited<ReturnType<typeof analizarRegistroBitacoraConIa>>;
  escrituraRealizada: false;
}

export async function analizarBitacoraShadow(
  empresaId: string,
  input: CrearRegistroBitacoraInput,
  usuario: UsuarioSesionEvaluacion
): Promise<ResultadoShadowBitacora> {
  const validado = validarCrearRegistroBitacora(input);

  console.info("[BITACORA-SHADOW] inicio", {
    empresaId,
    usuarioId: usuario.usuarioId,
    rol: usuario.rol,
    fechaEfectiva: input.fechaEfectiva,
    longitudContenido: validado.contenido.length,
  });

  const empresa = await asegurarAccesoBitacoraEmpresa(usuario, empresaId);
  const version = await servicioPeriodosEvaluacion.resolverVersionParaFecha(
    validado.fechaEfectiva
  );

  const candidatos = await buscarCandidatosAspectoBitacora({
    versionSupermatrizId: version.id,
    contenidoBitacora: validado.contenido,
  });

  console.info("[BITACORA-SHADOW] recuperacion", {
    empresaId,
    versionSupermatrizId: version.id,
    totalCandidatos: candidatos.length,
    aspectoIds: candidatos.map((candidato) => candidato.aspectoId),
  });

  const contextoAspectos = await cargarContextoAspectosBitacora({
    empresaId,
    versionSupermatrizId: version.id,
    fechaEfectiva: validado.fechaEfectiva,
    candidatos,
  });

  const idTemporal = `shadow-${randomUUID()}`;
  const fechaEfectiva = input.fechaEfectiva.trim();
  const urlsDisponibles = extraerUrlsBitacora(validado.contenido);

  const analisis = await analizarRegistroBitacoraConIa({
    registroBitacoraId: idTemporal,
    fechaEfectiva,
    contenidoOriginal: validado.contenido,
    urlsDisponibles,
    aspectos: contextoAspectos,
  });

  console.info("[BITACORA-SHADOW] completado", {
    empresaId,
    idTemporal,
    modelo: analisis.modelo,
    versionPrompt: analisis.versionPrompt,
    totalPropuestas: analisis.propuestas.length,
    propuestas: analisis.propuestas.map((propuesta) => ({
      aspectoId: propuesta.aspectoId,
      accion: propuesta.accion,
      calificacion: propuesta.calificacionAdministrativaPropuesta,
      confianza: propuesta.confianza,
      evidenciasUrls: propuesta.evidenciasUrls.length,
    })),
    escrituraRealizada: false,
  });

  return {
    modo: "SHADOW",
    empresa: {
      id: empresa.id,
      nombre: empresa.nombre,
    },
    versionSupermatriz: {
      id: version.id,
      nombre: version.nombre,
    },
    registro: {
      idTemporal,
      fechaEfectiva,
      contenidoOriginal: validado.contenido,
    },
    recuperacion: {
      totalCandidatos: candidatos.length,
      aspectosCandidatos: candidatos.map((candidato) => ({
        aspectoId: candidato.aspectoId,
        identidadHistorica: candidato.identidadHistorica,
        codigo: candidato.codigo,
        nombre: candidato.nombre,
        puntajeRecuperacion: candidato.puntajeRecuperacion,
      })),
    },
    analisis,
    escrituraRealizada: false,
  };
}
