export type ModelProviderKind =
  | "ollama"
  | "lm-studio"
  | "docker"
  | "openai"
  | "openrouter"
  | "anthropic"
  | "perplexity"
  | "mistral"
  | "qwen"
  | "deepseek"
  | "llama-meta"
  | "hugging-face"
  | "gemini"
  | "manual-http"
  | "manual-cli";

export type ModelIntegrationMethod = "auto-discovery" | "built-in" | "manual";
export type ModelRegistryStatus = "ready" | "needs-attention";

export type ModelAuth =
  | { type: "none" }
  | { type: "env"; envVar: string }
  | { type: "local"; apiKey: string };

export interface ModelRegistryRecord {
  id: string;
  providerKind: ModelProviderKind;
  integrationMethod: ModelIntegrationMethod;
  label: string;
  modelId: string;
  baseUrl?: string;
  command?: string;
  args?: string;
  auth: ModelAuth;
  status: ModelRegistryStatus;
  createdAtIso: string;
  updatedAtIso: string;
  source?: string;
}

export type ModelRegistryInput = Omit<
  ModelRegistryRecord,
  "id" | "status" | "createdAtIso" | "updatedAtIso"
>;

export interface ModelProviderDefinition {
  kind: ModelProviderKind;
  label: string;
  integrationMethod: ModelIntegrationMethod;
  group: "discovery" | "built-in" | "manual";
  defaultBaseUrl?: string;
  defaultModelId?: string;
  defaultAuthEnv?: string;
  requiresAuth: boolean;
  supportsCatalog: boolean;
}

export const modelProviderDefinitions: ModelProviderDefinition[] = [
  {
    kind: "ollama",
    label: "Ollama",
    integrationMethod: "auto-discovery",
    group: "discovery",
    defaultBaseUrl: "http://localhost:11434",
    defaultModelId: "llama3.2",
    requiresAuth: false,
    supportsCatalog: false,
  },
  {
    kind: "lm-studio",
    label: "LM Studio",
    integrationMethod: "auto-discovery",
    group: "discovery",
    defaultBaseUrl: "http://localhost:1234/v1",
    defaultModelId: "local-model",
    requiresAuth: false,
    supportsCatalog: false,
  },
  {
    kind: "docker",
    label: "Docker",
    integrationMethod: "auto-discovery",
    group: "discovery",
    requiresAuth: false,
    supportsCatalog: false,
  },
  {
    kind: "openai",
    label: "OpenAI",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModelId: "gpt-5.2",
    defaultAuthEnv: "OPENAI_API_KEY",
    requiresAuth: true,
    supportsCatalog: true,
  },
  {
    kind: "openrouter",
    label: "OpenRouter",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModelId: "openai/gpt-5.2",
    defaultAuthEnv: "OPENROUTER_API_KEY",
    requiresAuth: true,
    supportsCatalog: true,
  },
  {
    kind: "anthropic",
    label: "Anthropic",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModelId: "claude-sonnet-4-5",
    defaultAuthEnv: "ANTHROPIC_API_KEY",
    requiresAuth: true,
    supportsCatalog: true,
  },
  {
    kind: "perplexity",
    label: "Perplexity",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://api.perplexity.ai/v1",
    defaultModelId: "perplexity/sonar",
    defaultAuthEnv: "PERPLEXITY_API_KEY",
    requiresAuth: true,
    supportsCatalog: true,
  },
  {
    kind: "mistral",
    label: "Mistral",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    defaultModelId: "mistral-large-latest",
    defaultAuthEnv: "MISTRAL_API_KEY",
    requiresAuth: true,
    supportsCatalog: true,
  },
  {
    kind: "qwen",
    label: "Qwen",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    defaultModelId: "qwen-plus",
    defaultAuthEnv: "DASHSCOPE_API_KEY",
    requiresAuth: true,
    supportsCatalog: true,
  },
  {
    kind: "deepseek",
    label: "DeepSeek",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://api.deepseek.com",
    defaultModelId: "deepseek-chat",
    defaultAuthEnv: "DEEPSEEK_API_KEY",
    requiresAuth: true,
    supportsCatalog: true,
  },
  {
    kind: "llama-meta",
    label: "Llama / Meta",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://api.llama.com/compat/v1",
    defaultModelId: "Llama-3.3-70B-Instruct",
    defaultAuthEnv: "LLAMA_API_KEY",
    requiresAuth: true,
    supportsCatalog: true,
  },
  {
    kind: "hugging-face",
    label: "Hugging Face",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://huggingface.co/api",
    defaultModelId: "meta-llama/Llama-3.3-70B-Instruct",
    defaultAuthEnv: "HF_TOKEN",
    requiresAuth: false,
    supportsCatalog: true,
  },
  {
    kind: "gemini",
    label: "Gemini / Google",
    integrationMethod: "built-in",
    group: "built-in",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModelId: "gemini-2.0-flash",
    defaultAuthEnv: "GEMINI_API_KEY",
    requiresAuth: true,
    supportsCatalog: true,
  },
  {
    kind: "manual-http",
    label: "HTTP config",
    integrationMethod: "manual",
    group: "manual",
    defaultBaseUrl: "http://localhost:8000/v1",
    defaultModelId: "local-model",
    requiresAuth: false,
    supportsCatalog: true,
  },
  {
    kind: "manual-cli",
    label: "Local CLI",
    integrationMethod: "manual",
    group: "manual",
    defaultModelId: "local-cli",
    requiresAuth: false,
    supportsCatalog: false,
  },
];

export function getModelProviderDefinition(providerKind: ModelProviderKind) {
  return (
    modelProviderDefinitions.find((definition) => definition.kind === providerKind) ??
    modelProviderDefinitions[0]
  );
}

export function createDefaultModelInput(providerKind: ModelProviderKind): ModelRegistryInput {
  const definition = getModelProviderDefinition(providerKind);
  const auth: ModelAuth = definition.defaultAuthEnv
    ? { type: "env", envVar: definition.defaultAuthEnv }
    : { type: "none" };

  return {
    providerKind,
    integrationMethod: definition.integrationMethod,
    label: definition.label,
    modelId: definition.defaultModelId ?? "",
    baseUrl: definition.defaultBaseUrl,
    command: providerKind === "manual-cli" ? "codex" : undefined,
    args: providerKind === "manual-cli" ? "--model local-cli" : undefined,
    auth,
  };
}

export function normalizeModelInput(input: ModelRegistryInput): ModelRegistryInput {
  return {
    providerKind: input.providerKind,
    integrationMethod: input.integrationMethod,
    label: input.label.trim(),
    modelId: input.modelId.trim(),
    baseUrl: cleanOptional(input.baseUrl),
    command: cleanOptional(input.command),
    args: cleanOptional(input.args),
    auth: normalizeAuth(input.auth),
    source: cleanOptional(input.source),
  };
}

export function getModelRegistryStatus(input: ModelRegistryInput): ModelRegistryStatus {
  const normalizedInput = normalizeModelInput(input);
  const definition = getModelProviderDefinition(normalizedInput.providerKind);

  if (!normalizedInput.label || !normalizedInput.modelId) {
    return "needs-attention";
  }

  if (normalizedInput.providerKind === "manual-cli") {
    return normalizedInput.command ? "ready" : "needs-attention";
  }

  if (!normalizedInput.baseUrl) {
    return "needs-attention";
  }

  if (!definition.requiresAuth) {
    return "ready";
  }

  return hasUsableAuth(normalizedInput.auth) ? "ready" : "needs-attention";
}

export function createModelRegistryRecord(
  input: ModelRegistryInput,
  nowIso = new Date().toISOString(),
  id = createModelRecordId(),
): ModelRegistryRecord {
  const normalizedInput = normalizeModelInput(input);

  return {
    ...normalizedInput,
    id,
    status: getModelRegistryStatus(normalizedInput),
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };
}

export function updateModelRegistryRecord(
  current: ModelRegistryRecord,
  input: ModelRegistryInput,
  nowIso = new Date().toISOString(),
): ModelRegistryRecord {
  const normalizedInput = normalizeModelInput(input);

  return {
    ...current,
    ...normalizedInput,
    status: getModelRegistryStatus(normalizedInput),
    updatedAtIso: nowIso,
  };
}

export function upsertModelRegistryRecord(
  records: ModelRegistryRecord[],
  input: ModelRegistryInput,
  nowIso = new Date().toISOString(),
  idFactory = createModelRecordId,
) {
  const normalizedInput = normalizeModelInput(input);
  const existingIndex = records.findIndex(
    (record) => getModelRegistryIdentity(record) === getModelRegistryIdentity(normalizedInput),
  );

  if (existingIndex >= 0) {
    const nextRecords = [...records];
    const record = updateModelRegistryRecord(nextRecords[existingIndex], normalizedInput, nowIso);
    nextRecords[existingIndex] = record;

    return { records: nextRecords, record, action: "updated" as const };
  }

  const record = createModelRegistryRecord(normalizedInput, nowIso, idFactory());

  return { records: [...records, record], record, action: "created" as const };
}

export function getModelRegistryIdentity(
  input: Pick<ModelRegistryInput, "providerKind" | "modelId" | "baseUrl" | "command" | "args">,
) {
  return [
    input.providerKind,
    input.modelId.trim().toLowerCase(),
    input.baseUrl?.trim().replace(/\/$/, "").toLowerCase() ?? "",
    input.command?.trim().toLowerCase() ?? "",
    input.args?.trim() ?? "",
  ].join("::");
}

export function hasUsableAuth(auth: ModelAuth) {
  if (auth.type === "none") {
    return false;
  }

  if (auth.type === "env") {
    return Boolean(auth.envVar.trim());
  }

  return Boolean(auth.apiKey.trim());
}

function normalizeAuth(auth: ModelAuth): ModelAuth {
  if (auth.type === "env") {
    return {
      type: "env",
      envVar: auth.envVar.trim(),
    };
  }

  if (auth.type === "local") {
    return {
      type: "local",
      apiKey: auth.apiKey.trim(),
    };
  }

  return { type: "none" };
}

function cleanOptional(value?: string) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function createModelRecordId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `model:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}
