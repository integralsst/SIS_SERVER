import type { Response } from "express";

export interface DatosRendimientoHttp {
  nombre: string;
  inicio: bigint;
  resultado: "OK" | "ERROR";
  contexto?: Record<string, unknown>;
  umbralLogMs?: number;
}

export function finalizarMedicionHttp(
  res: Response,
  datos: DatosRendimientoHttp
): number {
  const duracionMs =
    Number(process.hrtime.bigint() - datos.inicio) / 1_000_000;
  const duracionRedondeada = Number(duracionMs.toFixed(1));
  const nombreSeguro = datos.nombre.replace(/[^a-z0-9-]/gi, "-");

  res.setHeader(
    "Server-Timing",
    `${nombreSeguro};dur=${duracionRedondeada}`
  );
  res.setHeader("X-Response-Time", `${duracionRedondeada}ms`);

  if (duracionMs >= (datos.umbralLogMs ?? 750)) {
    console.info(`[rendimiento] ${datos.nombre}`, {
      ...datos.contexto,
      resultado: datos.resultado,
      duracionMs: duracionRedondeada,
    });
  }

  return duracionRedondeada;
}
