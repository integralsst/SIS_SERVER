const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELO_DEFAULT = "openai/gpt-5.4-mini";
const TIMEOUT_DEFAULT_MS = 45_000;

export class ErrorOpenRouter extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly code = "OPENROUTER_ERROR"
  ) {
    super(message);
    this.name = "ErrorOpenRouter";
  }
}

export interface MensajeOpenRouter {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SolicitudJsonEstructuradoOpenRouter {
  mensajes: MensajeOpenRouter[];
  schemaName: string;
  schema: Record<string, unknown>;
}

export interface RespuestaJsonEstructuradoOpenRouter<T> {
  modelo: string;
  proveedor: string | null;
  requestId: string | null;
  datos: T;
  uso: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  };
}

function leerBooleanoEntorno(nombre: string, valorDefault = false): boolean {
  const valor = process.env[nombre]?.trim().toLowerCase();

  if (!valor) {
    return valorDefault;
  }

  return ["1", "true", "yes", "si", "sí", "on"].includes(valor);
}

function obtenerTimeoutMs(): number {
  const valor = Number(process.env.OPENROUTER_TIMEOUT_MS ?? TIMEOUT_DEFAULT_MS);

  if (!Number.isFinite(valor) || valor < 1_000 || valor > 120_000) {
    return TIMEOUT_DEFAULT_MS;
  }

  return Math.trunc(valor);
}

function obtenerProviderOnly(): string[] | undefined {
  const valor = process.env.OPENROUTER_PROVIDER_ONLY?.trim();

  if (!valor) {
    return undefined;
  }

  const proveedores = valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return proveedores.length > 0 ? proveedores : undefined;
}

export function obtenerConfiguracionOpenRouter() {
  return {
    enabled: leerBooleanoEntorno("OPENROUTER_ENABLED", false),
    apiKey: process.env.OPENROUTER_API_KEY?.trim() || null,
    model: process.env.OPENROUTER_MODEL?.trim() || MODELO_DEFAULT,
    timeoutMs: obtenerTimeoutMs(),
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || null,
    appName:
      process.env.OPENROUTER_APP_NAME?.trim() || "Stack44 SG-SST",
    providerOnly: obtenerProviderOnly(),
  };
}

export function estaOpenRouterDisponible(): boolean {
  const config = obtenerConfiguracionOpenRouter();
  return config.enabled && Boolean(config.apiKey);
}

function validarRespuestaContenido(valor: unknown): string {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new ErrorOpenRouter(
      "OpenRouter respondió sin contenido utilizable.",
      502,
      "OPENROUTER_RESPUESTA_VACIA"
    );
  }

  return valor.trim();
}

export async function solicitarJsonEstructuradoOpenRouter<T>(
  input: SolicitudJsonEstructuradoOpenRouter
): Promise<RespuestaJsonEstructuradoOpenRouter<T>> {
  const config = obtenerConfiguracionOpenRouter();

  if (!config.enabled) {
    throw new ErrorOpenRouter(
      "La integración de OpenRouter está desactivada.",
      503,
      "OPENROUTER_DESACTIVADO"
    );
  }

  if (!config.apiKey) {
    throw new ErrorOpenRouter(
      "OPENROUTER_API_KEY no está configurada.",
      503,
      "OPENROUTER_SIN_API_KEY"
    );
  }

  console.info("[OPENROUTER-BITACORA] solicitud", {
    modelo: config.model,
    proveedorPermitido: config.providerOnly ?? "routing-zdr",
    timeoutMs: config.timeoutMs,
    schemaName: input.schemaName,
    siteUrlConfigurado: Boolean(config.siteUrl),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };

    if (config.siteUrl) {
      headers["HTTP-Referer"] = config.siteUrl;
    }

    if (config.appName) {
      headers["X-Title"] = config.appName;
    }

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: input.mensajes,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: input.schemaName,
            strict: true,
            schema: input.schema,
          },
        },
        provider: {
          data_collection: "deny",
          zdr: true,
          require_parameters: true,
          allow_fallbacks: true,
          ...(config.providerOnly
            ? { only: config.providerOnly }
            : {}),
        },
      }),
    });

    const requestId = response.headers.get("x-request-id");
    const payload = (await response.json().catch(() => null)) as any;

    if (!response.ok) {
      const detalle =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : `OpenRouter respondió HTTP ${response.status}.`;

      console.error("[OPENROUTER-BITACORA] respuesta-error", {
        status: response.status,
        requestId,
        modelo: config.model,
        proveedor: typeof payload?.provider === "string" ? payload.provider : null,
        codigoProveedor:
          typeof payload?.error?.code === "string" ||
          typeof payload?.error?.code === "number"
            ? payload.error.code
            : null,
      });

      throw new ErrorOpenRouter(
        detalle,
        response.status >= 400 && response.status < 600
          ? response.status
          : 502,
        "OPENROUTER_HTTP_ERROR"
      );
    }

    const contenido = validarRespuestaContenido(
      payload?.choices?.[0]?.message?.content
    );

    let datos: T;

    try {
      datos = JSON.parse(contenido) as T;
    } catch {
      throw new ErrorOpenRouter(
        "OpenRouter devolvió contenido que no es JSON válido.",
        502,
        "OPENROUTER_JSON_INVALIDO"
      );
    }

    const resultado = {
      modelo:
        typeof payload?.model === "string" ? payload.model : config.model,
      proveedor:
        typeof payload?.provider === "string" ? payload.provider : null,
      requestId,
      datos,
      uso: {
        promptTokens:
          typeof payload?.usage?.prompt_tokens === "number"
            ? payload.usage.prompt_tokens
            : null,
        completionTokens:
          typeof payload?.usage?.completion_tokens === "number"
            ? payload.usage.completion_tokens
            : null,
        totalTokens:
          typeof payload?.usage?.total_tokens === "number"
            ? payload.usage.total_tokens
            : null,
      },
    } satisfies RespuestaJsonEstructuradoOpenRouter<T>;

    console.info("[OPENROUTER-BITACORA] respuesta-ok", {
      requestId: resultado.requestId,
      modelo: resultado.modelo,
      proveedor: resultado.proveedor,
      uso: resultado.uso,
    });

    return resultado;
  } catch (error) {
    if (error instanceof ErrorOpenRouter) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      console.error("[OPENROUTER-BITACORA] timeout", {
        modelo: config.model,
        timeoutMs: config.timeoutMs,
      });

      throw new ErrorOpenRouter(
        "La solicitud a OpenRouter superó el tiempo máximo permitido.",
        504,
        "OPENROUTER_TIMEOUT"
      );
    }

    console.error("[OPENROUTER-BITACORA] conexion-error", {
      modelo: config.model,
      error: error instanceof Error ? error.message : "error-desconocido",
    });

    throw new ErrorOpenRouter(
      error instanceof Error
        ? `No fue posible comunicarse con OpenRouter: ${error.message}`
        : "No fue posible comunicarse con OpenRouter.",
      502,
      "OPENROUTER_CONEXION_ERROR"
    );
  } finally {
    clearTimeout(timeout);
  }
}
