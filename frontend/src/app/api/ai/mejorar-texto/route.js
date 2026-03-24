import { NextResponse } from "next/server";

/* -------------------------
   Utils básicos
--------------------------*/

function cleanText(value = "") {
  return String(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForCompare(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/^[-*•]\s*/gm, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWords(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\*\*/g, " ")
    .replace(/^[-*•]\s*/gm, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function normalizeWordToken(word = "") {
  return String(word)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasNewVocabulary(original = "", candidate = "") {
  const sourceSet = new Set(normalizeWords(original).map(normalizeWordToken));
  const outWords = normalizeWords(candidate).map(normalizeWordToken);
  return outWords.some((w) => !sourceSet.has(w));
}

function preservesOriginalWordSequence(original = "", candidate = "") {
  const sourceWords = normalizeWords(original).map(normalizeWordToken);
  const outWords = normalizeWords(candidate).map(normalizeWordToken);

  let pointer = 0;
  for (const word of outWords) {
    if (pointer < sourceWords.length && word === sourceWords[pointer]) {
      pointer += 1;
    }
  }
  return pointer === sourceWords.length;
}

function stripMetaLines(value = "") {
  const lines = String(value)
    .replace(/\r/g, "")
    .split("\n");

  const isMetaLine = (line) => {
    const normalized = line
      .toLowerCase()
      .replace(/[!¡.,:;()¿?"'`]/g, "")
      .trim();

    if (!normalized) return false;
    if (normalized.startsWith("aqui tienes")) return true;
    if (normalized.startsWith("texto mejorado")) return true;
    if (normalized.startsWith("version mejorada")) return true;
    if (normalized.startsWith("resultado")) return true;
    if (normalized.startsWith("redaccion sugerida")) return true;
    if (normalized.startsWith("descripción sugerida")) return true;
    return false;
  };

  let startIndex = 0;
  while (startIndex < lines.length && isMetaLine(lines[startIndex])) {
    startIndex += 1;
  }

  return lines.slice(startIndex).join("\n").trim();
}

/* -------------------------
   Fallback simple (mínimo)
--------------------------*/

function fallbackFormat(text = "") {
  const normalized = cleanText(text);
  if (!normalized) return "";

  const lines = normalized.split("\n").filter((l) => l.trim());

  if (lines.length <= 1) return normalized;

  return lines.map((l) => `- ${l.trim()}`).join("\n");
}

function formatOnlyStructure(text = "") {
  const normalized = cleanText(text);
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const out = [];

  const isHeadingLine = (line) => {
    const t = line.trim();
    if (!t) return false;
    if (t.endsWith(":")) return true;
    if (
      t.length <= 40 &&
      /[A-ZÁÉÍÓÚÑ]/.test(t) &&
      t === t.toLocaleUpperCase("es-MX")
    ) {
      return true;
    }
    return false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      continue;
    }

    if (isHeadingLine(line)) {
      const heading = line.replace(/^\*\*(.*)\*\*$/, "$1").trim();
      out.push(`**${heading}**`);
      continue;
    }

    const bulletText = line.replace(/^[-*•]\s+/, "").trim();
    out.push(`- ${bulletText}`);
  }

  return out.join("\n").trim();
}

function fallbackRewrite(text = "", context = "general") {
  const normalized = cleanText(text);
  if (!normalized) return "";

  const rawLines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const bullets = [];
  rawLines.forEach((line) => {
    if (/^[-*•]\s+/.test(line)) {
      bullets.push(`- ${line.replace(/^[-*•]\s+/, "")}`);
      return;
    }

    if (line.includes(":")) {
      const [k, ...rest] = line.split(":");
      const key = k.trim();
      const val = rest.join(":").trim();
      if (key && val) {
        const label = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        bullets.push(`- ${label}: ${val}`);
        return;
      }
    }

    bullets.push(`- ${line}`);
  });

  const titleByContext = {
    detalles: "Características",
    envio: "Envío y devolución",
    info_adicional: "Información adicional",
    pago: "Pago",
    general: "Detalles",
  };
  const title = titleByContext[context] || titleByContext.general;

  return `**${title}**\n${bullets.join("\n")}`.trim();
}

/* -------------------------
   OpenRouter base
--------------------------*/

async function callOpenRouter(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter error: ${errorText}`);
  }

  const data = await res.json();
  const content = String(data?.choices?.[0]?.message?.content || "").trim();
  return content || null;
}

/* -------------------------
   PROMPTS (CLAVE 🔥)
--------------------------*/

function buildRewritePrompt(text, context, productName = "", productDescription = "") {
  const isShortDescription = String(context).toLowerCase() === "descripcion_corta";
  return [
    "Tu tarea es mejorar y estructurar texto libre para una ficha de producto en ecommerce.",
    "",
    "El texto puede pertenecer a cualquier tipo de producto o industria.",
    "No asumas una categoria especifica.",
    "",
    "Objetivo:",
    "- convertir texto libre, corto o desordenado en un texto claro, util y agradable de leer",
    "- mantener todos los datos reales del texto",
    "- mejorar redaccion, ortografia, puntuacion y estructura",
    "- organizar la informacion en bloques cuando tenga sentido",
    "",
    "Reglas obligatorias:",
    "- responde SOLO con markdown simple",
    "- usa subtitulos en **negrita** solo si aportan claridad",
    "- usa listas con '- ' cuando ayuden",
    "- si detectas medidas, especificaciones, cuidados, materiales o contenido, organizalos claramente",
    "- si el texto es muy suelto, interpretalo y acomodalo",
    "- si el texto ya esta bien, solo mejoralo ligeramente",
    "- no uses tablas",
    "- no uses emojis",
    "- no agregues texto fuera del resultado final",
    "- no agregues frases como: 'aqui tienes', 'texto mejorado', 'resultado', 'version mejorada'",
    "- entrega unicamente el markdown final, empezando directo con contenido util",
    "- no inventes datos",
    "- no cambies numeros, medidas, unidades, cantidades ni capacidades",
    "- evita texto robotico; debe leerse natural y comercial",
    ...(isShortDescription
      ? [
          "- para este caso, escribe una descripcion corta (maximo 2 renglones)",
          "- no uses subtitulos ni bloques largos",
          "- no agregues informacion que no venga del texto original o descripcion base",
          "- entrega una sola pieza de texto breve, clara y vendible",
          "- no repitas literalmente el nombre/titulo del producto dentro de la descripcion",
          "- prioriza lo que ya escribio el usuario en su input; usa el titulo solo como contexto",
        ]
      : []),
    "",
    `Contexto: ${context || "general"}`,
    `Nombre del producto: ${productName || "No especificado"}`,
    `Descripcion base del producto: ${productDescription || "No especificada"}`,
    "",
    "Texto original:",
    text,
  ].join("\n");
}

function buildFormatPrompt(text, context, productName = "", productDescription = "") {
  return [
    "Tu tarea es aplicar formato visual a texto para ficha de producto.",
    "",
    "Reglas OBLIGATORIAS:",
    "- responde SOLO con markdown simple",
    "- SI puedes corregir ortografia de acentos, mayusculas y puntuacion",
    "- NO agregues palabras nuevas",
    "- NO elimines palabras",
    "- NO cambies el orden de las palabras",
    "- NO reescribas frases",
    "- solo da formato visual: negritas, viñetas y saltos de linea",
    "- no inventes caracteristicas, medidas o beneficios",
    "- NO elimines informacion",
    "- usa **negritas** para titulos/subtitulos cuando aplique",
    "- usa listas con '- ' cuando aplique",
    "- no uses tablas",
    "- no uses emojis",
    "- no agregues frases de introduccion ni cierre",
    "- conserva exactamente numeros, medidas y unidades",
    "",
    `Contexto: ${context || "general"}`,
    `Nombre del producto: ${productName || "No especificado"}`,
    `Descripcion base del producto: ${productDescription || "No especificada"}`,
    "",
    "Importante: se permite ortografia minima, pero no se permite mover, agregar o quitar palabras.",
    "",
    "Texto original:",
    text,
  ].join("\n");
}

/* -------------------------
   Handlers
--------------------------*/

export async function POST(request) {
  try {
    const body = await request.json();
    const text = cleanText(body?.text || "");
    const context = String(body?.context || "general");
    const mode = String(body?.mode || "format"); // format | rewrite
    const productName = cleanText(body?.productName || "");
    const productDescription = cleanText(body?.productDescription || "");
    let fallbackReason = "";

    if (!text) {
      return NextResponse.json(
        { error: "Texto vacío" },
        { status: 400 }
      );
    }

    const prompt =
      mode === "rewrite"
        ? buildRewritePrompt(text, context, productName, productDescription)
        : buildFormatPrompt(text, context, productName, productDescription);

    /* -------------------------
       1) OpenRouter (principal)
    --------------------------*/

    try {
      const result = await callOpenRouter(prompt);
      const cleanedResult = mode === "rewrite" ? stripMetaLines(result) : result;

      if (cleanedResult) {
        if (mode === "format" && hasNewVocabulary(text, cleanedResult)) {
          throw new Error("Formato invalido: vocabulario nuevo");
        }
        if (mode === "format" && !preservesOriginalWordSequence(text, cleanedResult)) {
          throw new Error("Formato invalido: cambio fuerte de redaccion");
        }

        const changed =
          normalizeForCompare(cleanedResult) !== normalizeForCompare(text) ||
          cleanedResult.includes("**") ||
          /(^|\n)\s*[-*•]\s+/m.test(cleanedResult);

        if (changed) {
          return NextResponse.json({
            result: cleanedResult,
            provider: "openrouter",
            mode,
          });
        }
      }
    } catch (err) {
      const message = err?.message || "OpenRouter no disponible";
      fallbackReason = message.startsWith("Formato invalido") ? "" : message;
    }

    /* -------------------------
       2) Fallback simple
    --------------------------*/

    return NextResponse.json({
      result: mode === "rewrite" ? fallbackRewrite(text, context) : formatOnlyStructure(text),
      provider: "local",
      mode,
      reason: fallbackReason,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Error procesando texto" },
      { status: 500 }
    );
  }
}
