import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

/*
 * Stack44 trabaja contra una base MySQL remota.
 * Las transacciones interactivas de Prisma tienen tiempos muy cortos
 * por defecto; en una conexión remota pueden cerrarse antes de terminar.
 *
 * Estas opciones se aplican a TODAS las transacciones del backend:
 * - maxWait: tiempo máximo para obtener una transacción.
 * - timeout: tiempo máximo para terminarla antes de revertirla.
 */

const umbralConfigurado = Number(
  process.env.PRISMA_SLOW_QUERY_MS ?? "250"
);

const UMBRAL_CONSULTA_LENTA_MS =
  Number.isFinite(umbralConfigurado) && umbralConfigurado >= 0
    ? umbralConfigurado
    : 250;

function crearClientePrisma() {
  const client = new PrismaClient({
    transactionOptions: {
      maxWait: 15_000,
      timeout: 45_000,
    },
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "stdout",
        level: "warn",
      },
      {
        emit: "stdout",
        level: "error",
      },
    ],
  });

  client.$on("query", (event: Prisma.QueryEvent) => {
    if (event.duration < UMBRAL_CONSULTA_LENTA_MS) {
      return;
    }

    const operacion =
      event.query.trim().split(/\s+/, 1)[0]?.toUpperCase() ??
      "QUERY";

    console.info("[rendimiento] prisma-query", {
      operacion,
      target: event.target,
      duracionMs: event.duration,
    });
  });

  return client;
}

type ClientePrisma = ReturnType<typeof crearClientePrisma>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ClientePrisma;
};

export const prisma =
  globalForPrisma.prisma ?? crearClientePrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
