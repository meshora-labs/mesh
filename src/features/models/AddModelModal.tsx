import {
	Box,
	Cloud,
	Download,
	KeyRound,
	RefreshCw,
	Server,
	Terminal,
	type LucideIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
	createDefaultModelInput,
	getModelProviderDefinition,
	modelProviderDefinitions,
	type ModelAuth,
	type ModelProviderKind,
	type ModelRegistryInput,
} from "@/domain/model-registry";
import type {
	DiscoveredModel,
	DiscoveredModelSource,
	ModelCatalogEntry,
} from "@/platform/models";

interface AddModelModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (input: ModelRegistryInput) => Promise<boolean> | boolean;
	onDiscover: () => Promise<void> | void;
	onFetchCatalog: (
		input: ModelRegistryInput,
	) => Promise<ModelCatalogEntry[]>;
	discoverySources: DiscoveredModelSource[];
	discoveryStatus: string;
	discovering?: boolean;
	saving?: boolean;
}

const groupLabels = {
	discovery: "Discovery",
	"built-in": "Built-in",
	manual: "Manual",
} as const;

const groupDescriptions = {
	discovery: "Local runtimes and Docker containers.",
	"built-in": "Provider presets with catalog loading.",
	manual: "Direct HTTP or local CLI configuration.",
} as const;

const providerIcons: Record<ModelProviderKind, LucideIcon> = {
	ollama: Server,
	"lm-studio": Server,
	docker: Box,
	openai: Cloud,
	openrouter: Cloud,
	anthropic: Cloud,
	perplexity: Cloud,
	mistral: Cloud,
	qwen: Cloud,
	deepseek: Cloud,
	"llama-meta": Cloud,
	"hugging-face": Cloud,
	gemini: Cloud,
	"manual-http": KeyRound,
	"manual-cli": Terminal,
};

export function AddModelModal({
	open,
	onOpenChange,
	onSave,
	onDiscover,
	onFetchCatalog,
	discoverySources,
	discoveryStatus,
	discovering = false,
	saving = false,
}: AddModelModalProps) {
	const [input, setInput] = useState<ModelRegistryInput>(
		createDefaultModelInput("openai"),
	);
	const [catalog, setCatalog] = useState<ModelCatalogEntry[]>([]);
	const [catalogStatus, setCatalogStatus] = useState("Catalog not loaded.");
	const [catalogLoading, setCatalogLoading] = useState(false);
	const selectedDefinition = getModelProviderDefinition(input.providerKind);
	const visibleCatalog = catalog.slice(0, 24);
	const discoveredCount = discoverySources.reduce(
		(count, source) => count + source.models.length,
		0,
	);
	const groupedProviders = useMemo(
		() =>
			(["discovery", "built-in", "manual"] as const).map((group) => ({
				group,
				providers: modelProviderDefinitions.filter(
					(definition) => definition.group === group,
				),
			})),
		[],
	);

	useEffect(() => {
		if (!open) {
			return;
		}

		setInput(createDefaultModelInput("openai"));
		setCatalog([]);
		setCatalogStatus("Catalog not loaded.");
	}, [open]);

	function selectProvider(providerKind: ModelProviderKind) {
		setInput(createDefaultModelInput(providerKind));
		setCatalog([]);
		setCatalogStatus("Catalog not loaded.");
	}

	function setAuthType(type: ModelAuth["type"]) {
		if (type === "env") {
			setInput({
				...input,
				auth: {
					type: "env",
					envVar: selectedDefinition.defaultAuthEnv ?? "",
				},
			});
			return;
		}

		if (type === "local") {
			setInput({ ...input, auth: { type: "local", apiKey: "" } });
			return;
		}

		setInput({ ...input, auth: { type: "none" } });
	}

	function useDiscoveredModel(
		source: DiscoveredModelSource,
		model: DiscoveredModel,
	) {
		const providerKind = source.kind;

		if (providerKind !== "ollama" && providerKind !== "lm-studio") {
			return;
		}

		setInput({
			...createDefaultModelInput(providerKind),
			label: source.label,
			modelId: model.id,
			baseUrl: source.baseUrl ?? undefined,
			source: source.id,
		});
		setCatalog([]);
		setCatalogStatus("Catalog not loaded.");
	}

	function useDockerSource(source: DiscoveredModelSource) {
		setInput({
			...createDefaultModelInput("docker"),
			label: source.label,
			modelId: "",
			baseUrl: source.baseUrl ?? undefined,
			source: source.image ? `${source.image} / ${source.id}` : source.id,
		});
		setCatalog([]);
		setCatalogStatus("Catalog not loaded.");
	}

	async function loadCatalog() {
		setCatalogLoading(true);
		setCatalogStatus("Loading catalog...");

		try {
			const entries = await onFetchCatalog(input);
			setCatalog(entries);
			setCatalogStatus(
				entries.length > 0
					? `${entries.length} model${entries.length === 1 ? "" : "s"} found.`
					: "No models returned by this provider.",
			);
		} catch (error) {
			setCatalog([]);
			setCatalogStatus(
				error instanceof Error ? error.message : "Catalog request failed.",
			);
		} finally {
			setCatalogLoading(false);
		}
	}

	function useCatalogEntry(entry: ModelCatalogEntry) {
		setInput({
			...input,
			label: `${selectedDefinition.label} / ${entry.label}`,
			modelId: entry.id,
		});
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const didSave = await onSave(input);

		if (didSave) {
			onOpenChange(false);
		}
	}

	return (
		<Modal
			description="Register an agent model from local discovery, a provider catalog, HTTP, or CLI."
			onOpenChange={onOpenChange}
			open={open}
			title="Add model"
		>
			<form className="model-add-form" onSubmit={handleSubmit}>
				<div className="model-add-layout">
					<div className="model-source-list" aria-label="Model source">
						{groupedProviders.map(({ group, providers }) => (
							<div className="connect-source-group" key={group}>
								<div className="connect-source-group__label">
									{groupLabels[group]}
								</div>
								<p className="model-source-group__hint">
									{groupDescriptions[group]}
								</p>
								{providers.map((provider) => {
									const Icon = providerIcons[provider.kind];

									return (
										<button
											aria-pressed={provider.kind === input.providerKind}
											className={
												provider.kind === input.providerKind
													? "connect-source-option is-selected"
													: "connect-source-option"
											}
											key={provider.kind}
											onClick={() => selectProvider(provider.kind)}
											type="button"
										>
											<span className="connect-source-option__icon">
												<Icon size={16} />
											</span>
											<span>
												<strong>{provider.label}</strong>
												<small>{provider.integrationMethod}</small>
											</span>
										</button>
									);
								})}
							</div>
						))}
					</div>

					<div className="model-add-config">
						<div className="model-add-main">
							<section className="model-config-section">
								<header className="model-section-header">
									<div>
										<h3>{selectedDefinition.label}</h3>
										<p>{selectedDefinition.integrationMethod}</p>
									</div>
									<Badge
										tone={
											selectedDefinition.requiresAuth ? "warning" : "neutral"
										}
									>
										{selectedDefinition.requiresAuth ? "Auth" : "No auth"}
									</Badge>
								</header>

								<div className="model-form-grid">
									<label className="field-stack">
										<span>Name</span>
										<Input
											onChange={(event) =>
												setInput({ ...input, label: event.target.value })
											}
											placeholder="Provider / model"
											value={input.label}
										/>
									</label>

									<label className="field-stack">
										<span>Model ID</span>
										<Input
											onChange={(event) =>
												setInput({ ...input, modelId: event.target.value })
											}
											placeholder="gpt-5.2, llama3.2, local-model"
											value={input.modelId}
										/>
									</label>

									{input.providerKind === "manual-cli" ? (
										<>
											<label className="field-stack">
												<span>Command</span>
												<Input
													onChange={(event) =>
														setInput({
															...input,
															command: event.target.value,
														})
													}
													placeholder="codex, claude, gemini"
													value={input.command ?? ""}
												/>
											</label>
											<label className="field-stack">
												<span>Arguments</span>
												<Input
													onChange={(event) =>
														setInput({ ...input, args: event.target.value })
													}
													placeholder="--model gpt-5.2"
													value={input.args ?? ""}
												/>
											</label>
										</>
									) : (
										<label className="field-stack model-form-grid__wide">
											<span>Base URL</span>
											<Input
												onChange={(event) =>
													setInput({ ...input, baseUrl: event.target.value })
												}
												placeholder="https://api.provider.com/v1"
												value={input.baseUrl ?? ""}
											/>
										</label>
									)}
								</div>

								{input.providerKind !== "manual-cli" ? (
									<div className="auth-config">
										<span>Auth</span>
										<div className="auth-mode-row">
											{(["env", "local", "none"] as const).map((type) => (
												<button
													className={
														input.auth.type === type
															? "auth-mode is-selected"
															: "auth-mode"
													}
													key={type}
													onClick={() => setAuthType(type)}
													type="button"
												>
													{type === "env"
														? "Env var"
														: type === "local"
															? "Local key"
															: "None"}
												</button>
											))}
										</div>
										{input.auth.type === "env" ? (
											<Input
												onChange={(event) =>
													setInput({
														...input,
														auth: { type: "env", envVar: event.target.value },
													})
												}
												placeholder="OPENAI_API_KEY"
												value={input.auth.envVar}
											/>
										) : null}
										{input.auth.type === "local" ? (
											<Input
												onChange={(event) =>
													setInput({
														...input,
														auth: {
															type: "local",
															apiKey: event.target.value,
														},
													})
												}
												placeholder="API key"
												type="password"
												value={input.auth.apiKey}
											/>
										) : null}
									</div>
								) : null}
							</section>

							<section className="model-config-section">
								<header className="model-section-header">
									<div>
										<h3>Discovery</h3>
										<p>{discoveryStatus}</p>
									</div>
									<Button
										disabled={discovering}
										icon={<RefreshCw size={14} />}
										onClick={() => void onDiscover()}
										size="sm"
									>
										Scan
									</Button>
								</header>
								<div className="model-discovery-list">
									{discoverySources.length === 0 ? (
										<p className="model-muted-line">No scan results yet.</p>
									) : null}
									{discoverySources.map((source) => (
										<div className="model-discovery-source" key={source.id}>
											<div className="model-discovery-source__header">
												<div>
													<strong>{source.label}</strong>
													<span>{source.baseUrl ?? source.message ?? "No endpoint"}</span>
												</div>
												<Badge tone={source.online ? "good" : "neutral"}>
													{source.online ? "online" : "off"}
												</Badge>
											</div>
											{source.kind === "docker" ? (
												<div className="model-docker-row">
													<span>{source.image ?? "container"}</span>
													<Button
														icon={<Download size={13} />}
														onClick={() => useDockerSource(source)}
														size="sm"
													>
														Use
													</Button>
												</div>
											) : (
												source.models.slice(0, 8).map((model) => (
													<div className="model-catalog-row" key={model.id}>
														<span>{model.label}</span>
														<Button
															onClick={() => useDiscoveredModel(source, model)}
															size="sm"
														>
															Use
														</Button>
													</div>
												))
											)}
										</div>
									))}
								</div>
								<p className="model-muted-line">
									{discoveredCount} discovered model
									{discoveredCount === 1 ? "" : "s"}.
								</p>
							</section>
						</div>

						<aside className="model-catalog-panel">
							<header className="model-section-header">
								<div>
									<h3>Catalog</h3>
									<p>{catalogStatus}</p>
								</div>
								<Button
									disabled={!selectedDefinition.supportsCatalog || catalogLoading}
									icon={<Download size={14} />}
									onClick={() => void loadCatalog()}
									size="sm"
								>
									Load
								</Button>
							</header>
							<div className="model-catalog-list">
								{visibleCatalog.map((entry) => (
									<div className="model-catalog-row" key={entry.id}>
										<span>
											<strong>{entry.label}</strong>
											<small>{entry.id}</small>
										</span>
										<Button onClick={() => useCatalogEntry(entry)} size="sm">
											Use
										</Button>
									</div>
								))}
								{catalog.length > visibleCatalog.length ? (
									<p className="model-muted-line">
										Showing first {visibleCatalog.length} results.
									</p>
								) : null}
							</div>
						</aside>
					</div>
				</div>

				<div className="model-modal-footer">
					<Button disabled={saving} type="submit" variant="primary">
						{saving ? "Saving..." : "Save model"}
					</Button>
					<Button disabled={saving} onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
				</div>
			</form>
		</Modal>
	);
}
