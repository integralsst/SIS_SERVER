import { lookup } from "node:dns/promises";
import net from "node:net";

const TIMEOUT_MS = 7000;

type ResultadoTcp = {
  destino: string;
  resultado: "CONECTADO" | "TIMEOUT" | "ERROR";
  codigo?: string;
  duracionMs: number;
};

function probarTcp(host: string, puerto: number): Promise<ResultadoTcp> {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const socket = net.createConnection({ host, port: puerto });
    let finalizado = false;

    const terminar = (
      resultado: ResultadoTcp["resultado"],
      codigo?: string
    ): void => {
      if (finalizado) {
        return;
      }

      finalizado = true;
      socket.destroy();

      resolve({
        destino: `${host}:${puerto}`,
        resultado,
        codigo,
        duracionMs: Date.now() - inicio,
      });
    };

    socket.setTimeout(TIMEOUT_MS);

    socket.once("connect", () => {
      terminar("CONECTADO");
    });

    socket.once("timeout", () => {
      terminar("TIMEOUT", "ETIMEDOUT");
    });

    socket.once("error", (error: NodeJS.ErrnoException) => {
      terminar("ERROR", error.code ?? error.name);
    });
  });
}

export async function ejecutarDiagnosticoRedBaseDatos(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  console.log("[DB-NET-DIAG] Inicio del diagnóstico temporal de red MySQL.");

  if (!databaseUrl) {
    console.log(
      "[DB-NET-DIAG] OMITIDO: DATABASE_URL no está configurado."
    );
    return;
  }

  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    console.log(
      "[DB-NET-DIAG] ERROR: DATABASE_URL no tiene un formato URL válido."
    );
    return;
  }

  const host = url.hostname;
  const puerto = Number(url.port || "3306");

  console.log(`[DB-NET-DIAG] Host configurado: ${host}`);
  console.log(`[DB-NET-DIAG] Puerto configurado: ${puerto}`);
  console.log(
    "[DB-NET-DIAG] No se registran usuario, contraseña ni DATABASE_URL completa."
  );

  let direcciones: string[] = [];

  try {
    const resultadosDns = await lookup(host, {
      all: true,
      verbatim: true,
    });

    direcciones = [
      ...new Set(resultadosDns.map((resultado) => resultado.address)),
    ];

    console.log(
      `[DB-NET-DIAG] DNS ${host} -> ${
        direcciones.length > 0 ? direcciones.join(", ") : "sin resultados"
      }`
    );
  } catch (error) {
    const codigo =
      error instanceof Error && "code" in error
        ? String((error as NodeJS.ErrnoException).code ?? error.name)
        : error instanceof Error
          ? error.name
          : "DESCONOCIDO";

    console.log(`[DB-NET-DIAG] DNS ERROR: ${codigo}`);
  }

  const destinos = [host, ...direcciones].filter(
    (destino, indice, lista) => lista.indexOf(destino) === indice
  );

  for (const destino of destinos) {
    const resultado = await probarTcp(destino, puerto);

    console.log(
      `[DB-NET-DIAG] TCP ${resultado.destino} -> ${resultado.resultado}` +
        `${resultado.codigo ? ` (${resultado.codigo})` : ""}` +
        ` en ${resultado.duracionMs}ms`
    );
  }

  console.log("[DB-NET-DIAG] Fin del diagnóstico temporal de red MySQL.");
}
