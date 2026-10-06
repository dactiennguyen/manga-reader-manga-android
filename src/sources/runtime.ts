type SourcesRuntime = {
  allowNsfw: boolean;
};

const runtime: SourcesRuntime = {
  allowNsfw: false,
};

export function configureSources(patch: Partial<SourcesRuntime>): void {
  Object.assign(runtime, patch);
}

export function sourcesRuntime(): Readonly<SourcesRuntime> {
  return runtime;
}
