import {
	AlertTriangle,
	CheckCircle2,
	Database,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { StatusDot } from "@/components/ui/status-dot";
import {
	getModelProviderDefinition,
	type ModelAuth,
	type ModelProviderKind,
	type ModelRegistryInput,
	type ModelRegistryRecord,
	updateModelRegistryRecord,
	upsertModelRegistryRecord,
} from "@/domain/model-registry";
import { formatRelativeTime } from "@/features/shared/format";
import { AddModelModal } from "@/features/models/AddModelModal";
import {
	discoverModelSources,
	fetchModelCatalog,
	loadModelRegistry,
	saveModelRegistry,
	type DiscoveredModelSource,
	type ModelCatalogEntry,
} from "@/platform/models";

interface ModelsPageProps {
	initialModels?: ModelRegistryRecord[];
	initialDiscoverySources?: DiscoveredModelSource[];
	disablePersistence?: boolean;
}

const statusLabels = {
	ready: "Ready",
	"needs-attention": "Needs attention",
} as const;

const statusTones = {
	ready: "good",
	"needs-attention": "warning",
} as const;

export function ModelsPage({
	initialModels,
	initialDiscoverySources = [],
	disablePersistence = false,
}: ModelsPageProps) {
	const [models, setModels] = useState<ModelRegistryRecord[]>(
		initialModels ?? [],
	);
	const [selectedModelId, setSelectedModelId] = useState<string | null>(
		initialModels?.[0]?.id ?? null,
	);
	const [editInput, setEditInput] = useState<ModelRegistryInput | null>(
		initialModels?.[0] ? createInputFromRecord(initialModels[0]) : null,
	);
	const [query, setQuery] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [loading, setLoading] = useState(!initialModels && !disablePersistence);
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState(
		initialModels ? "Registry loaded." : "Loading model registry...",
	);
	const [discoverySources, setDiscoverySources] = useState<
		DiscoveredModelSource[]
	>(initialDiscoverySources);
	const [discovering, setDiscovering] = useState(false);
	const [discoveryStatus, setDiscoveryStatus] = useState("Discovery not run.");
	const visibleModels = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return models;
		}

		return models.filter((model) =>
			[
				model.label,
				model.modelId,
				model.baseUrl,
				model.command,
				getModelProviderDefinition(model.providerKind).label,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(normalizedQuery),
		);
	}, [models, query]);
	const selectedModel =
		models.find((model) => model.id === selectedModelId) ??
		visibleModels[0] ??
		null;
	const readyCount = models.filter((model) => model.status === "ready").length;
	const needsAttentionCount = models.length - readyCount;
	const discoveredCount = discoverySources.reduce(
		(count, source) => count + source.models.length,
		0,
	);

	useEffect(() => {
		if (disablePersistence || initialModels) {
			return;
		}

		let mounted = true;

		async function hydrateModels() {
			setLoading(true);

			try {
				const loadedModels = await loadModelRegistry();

				if (!mounted) {
					return;
				}

				setModels(loadedModels);
				setSelectedModelId(loadedModels[0]?.id ?? null);
				setStatus("Registry loaded.");
			} catch (error) {
				if (mounted) {
					setStatus(
						error instanceof Error
							? error.message
							: "Unable to load model registry.",
					);
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		}

		void hydrateModels();

		return () => {
			mounted = false;
		};
	}, [disablePersistence, initialModels]);

	useEffect(() => {
		if (selectedModel) {
			setEditInput(createInputFromRecord(selectedModel));
			return;
		}

		setEditInput(null);
	}, [selectedModel]);

	async function persistModels(nextModels: ModelRegistryRecord[]) {
		if (disablePersistence) {
			setModels(nextModels);
			return nextModels;
		}

		const persistedModels = await saveModelRegistry(nextModels);
		setModels(persistedModels);
		return persistedModels;
	}

	async function handleSaveModel(input: ModelRegistryInput) {
		setSaving(true);

		try {
			const result = upsertModelRegistryRecord(models, input);
			await persistModels(result.records);
			setSelectedModelId(result.record.id);
			setStatus(
				result.action === "created" ? "Model registered." : "Model updated.",
			);
			return true;
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Unable to save model.");
			return false;
		} finally {
			setSaving(false);
		}
	}

	async function handleUpdateSelected() {
		if (!selectedModel || !editInput) {
			return;
		}

		setSaving(true);

		try {
			const nextModels = models.map((model) =>
				model.id === selectedModel.id
					? updateModelRegistryRecord(model, editInput)
					: model,
			);
			await persistModels(nextModels);
			setStatus("Model updated.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Unable to update model.");
		} finally {
			setSaving(false);
		}
	}

	async function handleDeleteSelected() {
		if (!selectedModel) {
			return;
		}

		const didConfirm =
			typeof window === "undefined" ||
			window.confirm(`Delete model "${selectedModel.label}"?`);

		if (!didConfirm) {
			return;
		}

		setSaving(true);

		try {
			const nextModels = models.filter((model) => model.id !== selectedModel.id);
			await persistModels(nextModels);
			setSelectedModelId(nextModels[0]?.id ?? null);
			setStatus("Model deleted.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Unable to delete model.");
		} finally {
			setSaving(false);
		}
	}

	async function handleDiscover() {
		setDiscovering(true);
		setDiscoveryStatus("Scanning local runtimes and Docker...");

		try {
			const sources = await discoverModelSources();
			const sourceCount = sources.length;
			const modelCount = sources.reduce(
				(count, source) => count + source.models.length,
				0,
			);
			setDiscoverySources(sources);
			setDiscoveryStatus(
				`${sourceCount} source${sourceCount === 1 ? "" : "s"}, ${modelCount} model${modelCount === 1 ? "" : "s"}.`,
			);
		} catch (error) {
			setDiscoveryStatus(
				error instanceof Error ? error.message : "Discovery failed.",
			);
		} finally {
			setDiscovering(false);
		}
	}

	function handleFetchCatalog(
		input: ModelRegistryInput,
	): Promise<ModelCatalogEntry[]> {
		return fetchModelCatalog({
			providerKind: input.providerKind,
			baseUrl: input.baseUrl,
			auth: input.auth,
		});
	}

	const addModelButton = (
		<Button
			icon={<Plus size={14} />}
			onClick={() => setModalOpen(true)}
			size={models.length > 0 ? "sm" : "md"}
			variant="primary"
		>
			Add model
		</Button>
	);

	return (
		<>
			<div className="page-stack">
				<section className="metric-strip" aria-label="Model metrics">
					<div className="metric">
						<span>Registered</span>
						<strong>{models.length}</strong>
						<small>{loading ? "loading" : "local registry"}</small>
					</div>
					<div className="metric">
						<span>Ready</span>
						<strong>{readyCount}</strong>
						<small>usable configs</small>
					</div>
					<div className="metric">
						<span>Attention</span>
						<strong>{needsAttentionCount}</strong>
						<small>missing required fields</small>
					</div>
					<div className="metric">
						<span>Discovered</span>
						<strong>{discoveredCount}</strong>
						<small>{discoveryStatus}</small>
					</div>
				</section>

				{models.length === 0 && !loading ? (
					<EmptyState
						action={<div className="action-stack">{addModelButton}</div>}
						description="Register a provider, local runtime, Docker endpoint, HTTP config, or CLI model."
						icon={<Database size={22} />}
						title="No models registered"
					/>
				) : (
					<div className="models-grid">
						<Panel
							action={addModelButton}
							description={status}
							title="Model registry"
						>
							<label className="models-search">
								<Search size={15} />
								<Input
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Search provider, model, endpoint"
									type="search"
									value={query}
								/>
							</label>

							{visibleModels.length === 0 ? (
								<EmptyState
									description="Adjust the search query to show registered models."
									icon={<Search size={20} />}
									title="No matches"
								/>
							) : (
								<div className="models-table" role="table">
									<div className="models-table__header" role="row">
										<span>Model</span>
										<span>Provider</span>
										<span>Target</span>
										<span>Status</span>
										<span>Updated</span>
									</div>
									{visibleModels.map((model) => (
										<button
											className={
												model.id === selectedModel?.id
													? "models-table__row is-selected"
													: "models-table__row"
											}
											key={model.id}
											onClick={() => setSelectedModelId(model.id)}
											role="row"
											type="button"
										>
											<span className="models-table__name">
												<strong>{model.label}</strong>
												<small>{model.modelId}</small>
											</span>
											<span>{getModelProviderDefinition(model.providerKind).label}</span>
											<span>{getModelTarget(model)}</span>
											<span>
												<Badge tone={statusTones[model.status]}>
													<StatusDot tone={statusTones[model.status]} />
													{statusLabels[model.status]}
												</Badge>
											</span>
											<span>{formatRelativeTime(model.updatedAtIso)}</span>
										</button>
									))}
								</div>
							)}
						</Panel>

						<Panel description="Selection context" title="Model detail">
							{selectedModel && editInput ? (
								<div className="detail-stack">
									<div className="detail-header">
										{selectedModel.status === "ready" ? (
											<CheckCircle2 size={17} />
										) : (
											<AlertTriangle size={17} />
										)}
										<div>
											<h2>{selectedModel.label}</h2>
											<p>{selectedModel.modelId}</p>
										</div>
									</div>

									<div className="model-edit-form">
										<label className="field-stack">
											<span>Name</span>
											<Input
												onChange={(event) =>
													setEditInput({
														...editInput,
														label: event.target.value,
													})
												}
												value={editInput.label}
											/>
										</label>
										<label className="field-stack">
											<span>Model ID</span>
											<Input
												onChange={(event) =>
													setEditInput({
														...editInput,
														modelId: event.target.value,
													})
												}
												value={editInput.modelId}
											/>
										</label>
										{editInput.providerKind === "manual-cli" ? (
											<>
												<label className="field-stack">
													<span>Command</span>
													<Input
														onChange={(event) =>
															setEditInput({
																...editInput,
																command: event.target.value,
															})
														}
														value={editInput.command ?? ""}
													/>
												</label>
												<label className="field-stack">
													<span>Arguments</span>
													<Input
														onChange={(event) =>
															setEditInput({
																...editInput,
																args: event.target.value,
															})
														}
														value={editInput.args ?? ""}
													/>
												</label>
											</>
										) : (
											<label className="field-stack">
												<span>Base URL</span>
												<Input
													onChange={(event) =>
														setEditInput({
															...editInput,
															baseUrl: event.target.value,
														})
													}
													value={editInput.baseUrl ?? ""}
												/>
											</label>
										)}
									</div>

									<div className="property-grid">
										<span>Provider</span>
										<strong>
											{getModelProviderDefinition(selectedModel.providerKind).label}
										</strong>
										<span>Method</span>
										<strong>{selectedModel.integrationMethod}</strong>
										<span>Auth</span>
										<strong>{formatAuth(selectedModel.auth)}</strong>
										<span>Status</span>
										<strong>{statusLabels[selectedModel.status]}</strong>
									</div>

									<div className="button-row">
										<Button
											disabled={saving}
											onClick={() => void handleUpdateSelected()}
											variant="primary"
										>
											Save changes
										</Button>
										<Button
											disabled={saving}
											icon={<Trash2 size={14} />}
											onClick={() => void handleDeleteSelected()}
										>
											Delete
										</Button>
									</div>
								</div>
							) : (
								<EmptyState
									description="Select a model to inspect or edit it."
									title="No model selected"
								/>
							)}
						</Panel>
					</div>
				)}
			</div>

			<AddModelModal
				discovering={discovering}
				discoverySources={discoverySources}
				discoveryStatus={discoveryStatus}
				onDiscover={handleDiscover}
				onFetchCatalog={handleFetchCatalog}
				onOpenChange={setModalOpen}
				onSave={handleSaveModel}
				open={modalOpen}
				saving={saving}
			/>
		</>
	);
}

function createInputFromRecord(record: ModelRegistryRecord): ModelRegistryInput {
	return {
		providerKind: record.providerKind,
		integrationMethod: record.integrationMethod,
		label: record.label,
		modelId: record.modelId,
		baseUrl: record.baseUrl,
		command: record.command,
		args: record.args,
		auth: record.auth,
		source: record.source,
	};
}

function getModelTarget(record: ModelRegistryRecord) {
	if (record.providerKind === "manual-cli") {
		return [record.command, record.args].filter(Boolean).join(" ");
	}

	return record.baseUrl ?? "No endpoint";
}

function formatAuth(auth: ModelAuth) {
	if (auth.type === "env") {
		return auth.envVar;
	}

	if (auth.type === "local") {
		return "local key";
	}

	return "none";
}
