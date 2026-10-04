/**
 * Cấu hình engine cần biết từ phía app nhưng không nên import store trực tiếp
 * (giữ engine thuần để test được). App gọi configureSources khi setting đổi.
 */
type SourcesRuntime = {
  /** Cho phép nội dung 18+ (đã xác nhận tuổi và bật trong cài đặt). */
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
