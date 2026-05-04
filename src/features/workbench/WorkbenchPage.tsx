import {
  Activity,
  BrainCircuit,
  Clock3,
  Gauge,
  LayoutTemplate,
  Mic,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { StatusDot } from "@/components/ui/status-dot";
import {
  getModelProviderDefinition,
  type ModelProviderKind,
  type ModelRegistryRecord,
} from "@/domain/model-registry";
import type { AgentProfile, Project } from "@/domain/types";

interface WorkbenchPageProps {
  agents: AgentProfile[];
  models: ModelRegistryRecord[];
  projects: Project[];
}

type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";
type Verbosity = "low" | "medium" | "high";
type SummaryMode = "auto" | "concise" | "detailed" | "null";
type ResponseFormat = "text" | "json" | "json-schema";
type MessageRole = "user" | "assistant";
type LogLevel = "info" | "success" | "warning";

interface WorkbenchVariable {
  id: string;
  key: string;
  value: string;
}

interface WorkbenchMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAtIso: string;
}

interface WorkbenchLog {
  id: string;
  level: LogLevel;
  message: string;
  createdAtIso: string;
}

interface WorkbenchRunState {
  traceId: string;
  phase: "idle" | "prepared";
  inputTokens: number;
  outputTokens: number;
  createdAtIso: string;
}

interface ModelFeatureAvailability {
  reasoning: boolean;
  verbosity: boolean;
  summary: boolean;
  storeLogs: boolean;
  functions: boolean;
  json: boolean;
  jsonSchema: boolean;
}

const reasoningOptions = ["none", "low", "medium", "high", "xhigh"] as const;
const verbosityOptions = ["low", "medium", "high"] as const;
const summaryOptions = ["auto", "concise", "detailed", "null"] as const;

const responseFormatLabels: Record<ResponseFormat, string> = {
  text: "Text",
  json: "JSON",
  "json-schema": "JSON Schema",
};

const DEFAULT_SYSTEM_INSTRUCTION =
  "You are a Mesh workbench agent. Be precise, state constraints, and keep actions grounded in the selected project.";

const meshoraCapabilities = [
  { id: "meshora-context", label: "Project context" },
  { id: "meshora-planner", label: "Meshora planner" },
  { id: "meshora-replay", label: "Run replay" },
  { id: "meshora-telemetry", label: "Telemetry capture" },
] as const;

const llmCapabilityDefinitions = [
  { id: "llm-streaming", label: "Streaming", feature: "storeLogs" },
  { id: "llm-reasoning", label: "Reasoning", feature: "reasoning" },
  { id: "llm-structured-output", label: "Structured output", feature: "json" },
  { id: "llm-functions", label: "Function calling", feature: "functions" },
] as const;

const functionOptions = [
  { id: "fn-read-project", label: "Read project" },
  { id: "fn-search-files", label: "Search files" },
  { id: "fn-run-command", label: "Run command" },
] as const;

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function estimateTokens(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean).length;

  return words === 0 ? 0 : Math.ceil(words * 1.35);
}

function formatLogTime(createdAtIso: string) {
  return timeFormatter.format(new Date(createdAtIso));
}

function getModelFeatures(providerKind?: ModelProviderKind): ModelFeatureAvailability {
  if (!providerKind) {
    return {
      reasoning: false,
      verbosity: false,
      summary: false,
      storeLogs: true,
      functions: false,
      json: false,
      jsonSchema: false,
    };
  }

  const isOpenAiResponses = providerKind === "openai" || providerKind === "openrouter";
  const isHttpCompatible = providerKind !== "manual-cli" && providerKind !== "docker";
  const supportsJson = providerKind !== "manual-cli" && providerKind !== "docker";

  return {
    reasoning: isOpenAiResponses,
    verbosity: isOpenAiResponses,
    summary: isOpenAiResponses,
    storeLogs: true,
    functions: isHttpCompatible,
    json: supportsJson,
    jsonSchema:
      isOpenAiResponses ||
      providerKind === "anthropic" ||
      providerKind === "gemini" ||
      providerKind === "manual-http",
  };
}

function getResponseFormats(features: ModelFeatureAvailability): ResponseFormat[] {
  const formats: ResponseFormat[] = ["text"];

  if (features.json) {
    formats.push("json");
  }

  if (features.jsonSchema) {
    formats.push("json-schema");
  }

  return formats;
}

function toggleListValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export function WorkbenchPage({ agents, models, projects }: WorkbenchPageProps) {
  const defaultAgent = agents[0] ?? null;
  const defaultModel = models.find((model) => model.status === "ready") ?? models[0] ?? null;
  const [selectedAgentId, setSelectedAgentId] = useState(defaultAgent?.id ?? "");
  const [selectedModelId, setSelectedModelId] = useState(defaultModel?.id ?? "");
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [profileName, setProfileName] = useState(defaultAgent?.name ?? "Agent profile");
  const [agentRole, setAgentRole] = useState(defaultAgent?.role ?? "");
  const [temperature, setTemperature] = useState(0.4);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topP, setTopP] = useState(1);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>("medium");
  const [verbosity, setVerbosity] = useState<Verbosity>("medium");
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("auto");
  const [storeLogs, setStoreLogs] = useState(true);
  const [responseFormat, setResponseFormat] = useState<ResponseFormat>("text");
  const [enabledCapabilities, setEnabledCapabilities] = useState<string[]>([
    "meshora-context",
    "meshora-telemetry",
    "llm-streaming",
  ]);
  const [enabledFunctions, setEnabledFunctions] = useState<string[]>(["fn-read-project"]);
  const [variables, setVariables] = useState<WorkbenchVariable[]>([]);
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);
  const [assistantPrompt, setAssistantPrompt] = useState(defaultAgent?.role ?? "");
  const [userPrompt, setUserPrompt] = useState("");
  const [messages, setMessages] = useState<WorkbenchMessage[]>([]);
  const [logs, setLogs] = useState<WorkbenchLog[]>([]);
  const [autoFollow, setAutoFollow] = useState(true);
  const [debugLogsOpen, setDebugLogsOpen] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [voiceArmed, setVoiceArmed] = useState(false);
  const [runState, setRunState] = useState<WorkbenchRunState>({
    traceId: "",
    phase: "idle",
    inputTokens: 0,
    outputTokens: 0,
    createdAtIso: "",
  });
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? defaultAgent;
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? defaultModel;
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const modelDefinition = selectedModel
    ? getModelProviderDefinition(selectedModel.providerKind)
    : null;
  const features = useMemo(
    () => getModelFeatures(selectedModel?.providerKind),
    [selectedModel?.providerKind],
  );
  const responseFormats = useMemo(() => getResponseFormats(features), [features]);
  const estimatedInputTokens = useMemo(
    () =>
      estimateTokens(
        [
          systemInstruction,
          assistantPrompt,
          userPrompt,
          ...variables.flatMap((variable) => [variable.key, variable.value]),
        ].join("\n"),
      ),
    [assistantPrompt, systemInstruction, userPrompt, variables],
  );
  const llmCapabilities = useMemo(
    () =>
      llmCapabilityDefinitions.map((capability) => ({
        ...capability,
        available: features[capability.feature],
      })),
    [features],
  );

  useEffect(() => {
    if (projects.length === 0 || projects.some((project) => project.id === selectedProjectId)) {
      return;
    }

    setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (responseFormats.includes(responseFormat)) {
      return;
    }

    setResponseFormat(responseFormats[0] ?? "text");
  }, [responseFormat, responseFormats]);

  useEffect(() => {
    if (!autoFollow) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [autoFollow]);

  function appendLog(level: LogLevel, message: string) {
    if (!storeLogs) {
      return;
    }

    setLogs((currentLogs) => [
      ...currentLogs,
      {
        id: createLocalId("log"),
        level,
        message,
        createdAtIso: new Date().toISOString(),
      },
    ]);
  }

  function handleAgentChange(nextAgentId: string) {
    const nextAgent = agents.find((agent) => agent.id === nextAgentId);
    setSelectedAgentId(nextAgentId);

    if (!nextAgent) {
      return;
    }

    setProfileName(nextAgent.name);
    setAgentRole(nextAgent.role);
    setAssistantPrompt(nextAgent.role);
  }

  function addVariable() {
    setVariables((currentVariables) => [
      ...currentVariables,
      { id: createLocalId("var"), key: "", value: "" },
    ]);
  }

  function updateVariable(variableId: string, patch: Partial<Omit<WorkbenchVariable, "id">>) {
    setVariables((currentVariables) =>
      currentVariables.map((variable) =>
        variable.id === variableId ? { ...variable, ...patch } : variable,
      ),
    );
  }

  function removeVariable(variableId: string) {
    setVariables((currentVariables) =>
      currentVariables.filter((variable) => variable.id !== variableId),
    );
  }

  function handleSend() {
    const content = userPrompt.trim();

    if (!content) {
      return;
    }

    const now = new Date().toISOString();
    const inputTokens = estimatedInputTokens || estimateTokens(content);

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createLocalId("message"),
        role: "user",
        content,
        createdAtIso: now,
      },
    ]);
    setRunState({
      traceId: createLocalId("trace"),
      phase: "prepared",
      inputTokens,
      outputTokens: 0,
      createdAtIso: now,
    });
    appendLog(
      "info",
      `Prepared ${selectedModel?.modelId ?? "model"} with ${inputTokens} estimated input tokens.`,
    );
    setUserPrompt("");
  }

  function handleReplay() {
    const lastUserMessage = messages.filter((message) => message.role === "user").at(-1);

    if (!lastUserMessage) {
      return;
    }

    setUserPrompt(lastUserMessage.content);
    appendLog("success", "Replay loaded the last user prompt.");
  }

  if (agents.length === 0 && models.length === 0) {
    return (
      <EmptyState
        description="Register an agent profile and model before opening the workbench."
        icon={<LayoutTemplate size={22} />}
        title="Workbench unavailable"
      />
    );
  }

  return (
    <div className="workbench-layout">
      <aside className="workbench-config-column" aria-label="Options and parameters">
        <Panel description="Agent, project, and provider contract" title="Agent profile">
          <div className="workbench-form-grid">
            <label className="workbench-field">
              <span>Agent</span>
              <select
                className="input workbench-select"
                value={selectedAgentId}
                onChange={(event) => handleAgentChange(event.target.value)}
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="workbench-field">
              <span>Model</span>
              <select
                className="input workbench-select"
                value={selectedModelId}
                onChange={(event) => setSelectedModelId(event.target.value)}
              >
                {models.length === 0 ? <option value="">No model registered</option> : null}
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} / {model.modelId}
                  </option>
                ))}
              </select>
            </label>
            <label className="workbench-field" htmlFor="profile-name">
              <span>Profile name</span>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
            </label>
            <label className="workbench-field">
              <span>Project</span>
              <select
                className="input workbench-select"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="workbench-profile-card">
            <div>
              <strong>{selectedAgent?.name ?? "No agent"}</strong>
              <span>{agentRole || selectedAgent?.role || "No role configured"}</span>
            </div>
            <Badge tone={selectedAgent?.status === "disabled" ? "warning" : "good"}>
              {selectedAgent?.status ?? "idle"}
            </Badge>
          </div>
        </Panel>

        <Panel description={modelDefinition?.label ?? "No provider selected"} title="Generation">
          <div className="workbench-number-grid">
            <RangeField
              label="Temperature"
              max={2}
              min={0}
              onChange={setTemperature}
              step={0.1}
              value={temperature}
            />
            <RangeField label="Top p" max={1} min={0} onChange={setTopP} step={0.05} value={topP} />
            <label className="workbench-field" htmlFor="max-tokens">
              <span>Max tokens</span>
              <Input
                id="max-tokens"
                min={1}
                onChange={(event) => setMaxTokens(Number(event.target.value))}
                step={128}
                type="number"
                value={maxTokens}
              />
            </label>
            <label className="workbench-field">
              <span>Response format</span>
              <select
                className="input workbench-select"
                value={responseFormat}
                onChange={(event) => setResponseFormat(event.target.value as ResponseFormat)}
              >
                {responseFormats.map((format) => (
                  <option key={format} value={format}>
                    {responseFormatLabels[format]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="workbench-option-stack">
            <SegmentedControl
              disabled={!features.reasoning}
              label="Reasoning effort"
              onChange={setReasoningEffort}
              options={reasoningOptions}
              value={reasoningEffort}
            />
            <SegmentedControl
              disabled={!features.verbosity}
              label="Verbosity"
              onChange={setVerbosity}
              options={verbosityOptions}
              value={verbosity}
            />
            <SegmentedControl
              disabled={!features.summary}
              label="Summary"
              onChange={setSummaryMode}
              options={summaryOptions}
              value={summaryMode}
            />
            <label className="workbench-check-row">
              <input
                checked={storeLogs}
                disabled={!features.storeLogs}
                onChange={(event) => setStoreLogs(event.target.checked)}
                type="checkbox"
              />
              <span>Store logs</span>
            </label>
          </div>
        </Panel>

        <Panel description="Meshora and provider tools" title="Capabilities">
          <div className="workbench-capability-groups">
            <CapabilityGroup
              items={meshoraCapabilities.map((capability) => ({
                ...capability,
                available: true,
              }))}
              onToggle={(capabilityId) =>
                setEnabledCapabilities((currentValues) =>
                  toggleListValue(currentValues, capabilityId),
                )
              }
              selected={enabledCapabilities}
              title="Meshora built-in"
            />
            <CapabilityGroup
              items={llmCapabilities}
              onToggle={(capabilityId) =>
                setEnabledCapabilities((currentValues) =>
                  toggleListValue(currentValues, capabilityId),
                )
              }
              selected={enabledCapabilities}
              title="LLM built-in"
            />
          </div>

          <div className="workbench-function-block">
            <div className="workbench-subheader">
              <span>Functions</span>
              <Badge tone={features.functions ? "good" : "warning"}>
                {features.functions ? "available" : "unavailable"}
              </Badge>
            </div>
            <div className="workbench-toggle-list">
              {functionOptions.map((option) => (
                <label className="workbench-check-row" key={option.id}>
                  <input
                    checked={features.functions && enabledFunctions.includes(option.id)}
                    disabled={!features.functions}
                    onChange={() =>
                      setEnabledFunctions((currentValues) =>
                        toggleListValue(currentValues, option.id),
                      )
                    }
                    type="checkbox"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          action={
            <Button icon={<Plus size={14} />} onClick={addVariable} size="sm">
              Add
            </Button>
          }
          description="Template values for prompt resolution"
          title="Variables"
        >
          {variables.length === 0 ? (
            <div className="workbench-empty-line">No variables configured.</div>
          ) : (
            <div className="workbench-variable-list">
              {variables.map((variable) => (
                <div className="workbench-variable-row" key={variable.id}>
                  <Input
                    aria-label="Variable name"
                    placeholder="name"
                    value={variable.key}
                    onChange={(event) => updateVariable(variable.id, { key: event.target.value })}
                  />
                  <Input
                    aria-label="Variable value"
                    placeholder="value"
                    value={variable.value}
                    onChange={(event) => updateVariable(variable.id, { value: event.target.value })}
                  />
                  <IconButton label="Remove variable" onClick={() => removeVariable(variable.id)}>
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel description="Prompt contract sent before the user turn" title="Prompts">
          <div className="workbench-prompt-stack">
            <label className="workbench-field">
              <span>System instruction</span>
              <textarea
                className="workbench-textarea workbench-textarea--system"
                value={systemInstruction}
                onChange={(event) => setSystemInstruction(event.target.value)}
              />
            </label>
            <label className="workbench-field">
              <span>Assistant prompt</span>
              <textarea
                className="workbench-textarea"
                placeholder="Optional assistant context"
                value={assistantPrompt}
                onChange={(event) => setAssistantPrompt(event.target.value)}
              />
            </label>
          </div>
        </Panel>
      </aside>

      <section className="workbench-console" aria-label="Message box">
        <header className="workbench-console__header">
          <div>
            <span className="eyebrow">Message box</span>
            <h2>{profileName || selectedAgent?.name || "Workbench run"}</h2>
            <p>
              {selectedModel?.modelId ?? "No model"} · {selectedProject?.name ?? "No project"}
            </p>
          </div>
          <div className="workbench-console__actions">
            <ToggleButton active={autoFollow} onClick={() => setAutoFollow((value) => !value)}>
              Auto follow
            </ToggleButton>
            <Button icon={<RotateCcw size={14} />} onClick={handleReplay} size="sm">
              Replay
            </Button>
            <ToggleButton
              active={debugLogsOpen}
              onClick={() => setDebugLogsOpen((value) => !value)}
            >
              Debug logs
            </ToggleButton>
            <ToggleButton
              active={realtimeEnabled}
              onClick={() => setRealtimeEnabled((value) => !value)}
            >
              Realtime
            </ToggleButton>
          </div>
        </header>

        <section className="workbench-telemetry" aria-label="Telemetry">
          <TelemetryMetric
            icon={<Activity size={15} />}
            label="State"
            value={runState.phase === "prepared" ? "Prepared" : "Idle"}
          />
          <TelemetryMetric
            icon={<Gauge size={15} />}
            label="Input"
            value={`${runState.inputTokens || estimatedInputTokens}`}
          />
          <TelemetryMetric
            icon={<BrainCircuit size={15} />}
            label="Output cap"
            value={`${maxTokens}`}
          />
          <TelemetryMetric
            icon={<Clock3 size={15} />}
            label="Trace"
            value={runState.traceId || "not started"}
          />
        </section>

        <div className="workbench-message-stream">
          {messages.length === 0 ? (
            <div className="workbench-message-empty">
              <LayoutTemplate size={22} />
              <strong>No messages yet</strong>
            </div>
          ) : (
            messages.map((message) => (
              <article
                className={`workbench-message workbench-message--${message.role}`}
                key={message.id}
              >
                <header>
                  <span>{message.role === "assistant" ? "Assistant" : "User"}</span>
                  <time dateTime={message.createdAtIso}>{formatLogTime(message.createdAtIso)}</time>
                </header>
                <p>{message.content}</p>
              </article>
            ))
          )}
          {debugLogsOpen ? (
            <div className="workbench-debug-log">
              <div className="workbench-subheader">
                <span>Debug logs</span>
                <Badge tone={storeLogs ? "live" : "warning"}>{storeLogs ? "stored" : "off"}</Badge>
              </div>
              {logs.length === 0 ? (
                <div className="workbench-empty-line">No debug logs.</div>
              ) : (
                logs.map((log) => (
                  <div className="workbench-log-row" key={log.id}>
                    <StatusDot tone={log.level === "warning" ? "warning" : "good"} />
                    <span>{formatLogTime(log.createdAtIso)}</span>
                    <strong>{log.message}</strong>
                  </div>
                ))
              )}
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <footer className="workbench-composer">
          <label className="workbench-field">
            <span>User prompt</span>
            <textarea
              className="workbench-textarea workbench-textarea--composer"
              placeholder="Type the next user prompt..."
              value={userPrompt}
              onChange={(event) => setUserPrompt(event.target.value)}
            />
          </label>
          <div className="workbench-composer__footer">
            <div className="workbench-inline-state">
              <StatusDot tone={realtimeEnabled ? "live" : "neutral"} />
              <span>{realtimeEnabled ? "Realtime on" : "Realtime off"}</span>
            </div>
            <div className="workbench-console__actions">
              <ToggleButton
                active={voiceArmed}
                icon={<Mic size={14} />}
                onClick={() => setVoiceArmed((value) => !value)}
              >
                Voice
              </ToggleButton>
              <Button icon={<Send size={14} />} onClick={handleSend} size="sm" variant="primary">
                Send
              </Button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: Readonly<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}>) {
  return (
    <label className="workbench-field">
      <span>{label}</span>
      <div className="workbench-range-row">
        <input
          max={max}
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          step={step}
          type="range"
          value={value}
        />
        <Input
          max={max}
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          step={step}
          type="number"
          value={value}
        />
      </div>
    </label>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: Readonly<{
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}>) {
  return (
    <div className="workbench-segment-field">
      <div className="workbench-subheader">
        <span>{label}</span>
        <Badge tone={disabled ? "warning" : "good"}>{disabled ? "unavailable" : "available"}</Badge>
      </div>
      <fieldset className="workbench-segmented" aria-label={label}>
        {options.map((option) => (
          <button
            aria-pressed={option === value}
            className={option === value ? "is-selected" : ""}
            disabled={disabled}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </fieldset>
    </div>
  );
}

function CapabilityGroup({
  title,
  items,
  selected,
  onToggle,
}: Readonly<{
  title: string;
  items: Array<{ id: string; label: string; available: boolean }>;
  selected: string[];
  onToggle: (id: string) => void;
}>) {
  return (
    <div className="workbench-function-block">
      <div className="workbench-subheader">
        <span>{title}</span>
      </div>
      <div className="workbench-toggle-list">
        {items.map((item) => (
          <label className="workbench-check-row" key={item.id}>
            <input
              checked={item.available && selected.includes(item.id)}
              disabled={!item.available}
              onChange={() => onToggle(item.id)}
              type="checkbox"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  children,
  icon,
  onClick,
}: Readonly<{
  active: boolean;
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      aria-pressed={active}
      className={active ? "workbench-toggle-button is-active" : "workbench-toggle-button"}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function TelemetryMetric({
  icon,
  label,
  value,
}: Readonly<{
  icon: ReactNode;
  label: string;
  value: string;
}>) {
  return (
    <div className="workbench-telemetry__item">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
