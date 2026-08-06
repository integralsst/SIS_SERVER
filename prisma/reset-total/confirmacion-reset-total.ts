const CONFIRMACION_REQUERIDA =
  "BORRAR_TODA_LA_DATA_STACK44";

interface DestinoBaseDatos {
  host: string;
  nombre: string;
}

function obtenerDestinoBaseDatos(): DestinoBaseDatos {
  const databaseUrl =
    process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL no está definida."
    );
  }

  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error(
      "DATABASE_URL no tiene un formato válido."
    );
  }

  const nombre = decodeURIComponent(
    url.pathname.replace(/^\/+/, "")
  );

  if (!nombre) {
    throw new Error(
      "No fue posible identificar el nombre de la base en DATABASE_URL."
    );
  }

  return {
    host: url.hostname,
    nombre,
  };
}

export function validarConfirmacionResetTotal():
DestinoBaseDatos {
  const confirmacion =
    process.env.CONFIRM_RESET_TOTAL?.trim();
  const nombreEsperado =
    process.env.RESET_DATABASE_NAME?.trim();
  const destino = obtenerDestinoBaseDatos();

  if (
    confirmacion !== CONFIRMACION_REQUERIDA
  ) {
    throw new Error(
      "Reset cancelado. Define CONFIRM_RESET_TOTAL=" +
        CONFIRMACION_REQUERIDA +
        "."
    );
  }

  if (!nombreEsperado) {
    throw new Error(
      "Reset cancelado. Define RESET_DATABASE_NAME con el nombre exacto de la base."
    );
  }

  if (nombreEsperado !== destino.nombre) {
    throw new Error(
      "Reset cancelado. RESET_DATABASE_NAME no coincide con la base de DATABASE_URL."
    );
  }

  return destino;
}

