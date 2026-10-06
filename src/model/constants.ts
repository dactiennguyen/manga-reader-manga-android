import type {
  ArtStyle,
  BlockType,
  BubbleType,
  ChapterStatus,
  CharacterRole,
  DialogueKind,
  EffectType,
  Expression,
  PageStatus,
  ProjectStatus,
  Shot,
  WorldType,
} from './types';

export const APP_NAME = 'Mangaka AI';

export const GENRES = [
  'Hành động',
  'Phiêu lưu',
  'Lãng mạn',
  'Hài',
  'Kinh dị',
  'Học đường',
  'Giả tưởng',
  'Khoa học viễn tưởng',
  'Đời thường',
  'Trinh thám',
  'Thể thao',
  'Lịch sử',
] as const;

export const ART_STYLES: { id: ArtStyle; label: string; hint: string }[] = [
  { id: 'shounen', label: 'Shounen', hint: 'Nét khoẻ, hành động' },
  { id: 'shoujo', label: 'Shoujo', hint: 'Nét mảnh, mắt to, lãng mạn' },
  { id: 'seinen', label: 'Seinen', hint: 'Tả thực, nhiều chi tiết' },
  { id: 'chibi', label: 'Chibi', hint: 'Đầu to, dễ thương' },
  { id: 'horror', label: 'Kinh dị', hint: 'Tương phản mạnh, bóng tối' },
  { id: 'slice', label: 'Đời thường', hint: 'Nhẹ nhàng, tối giản' },
];

export const ART_STYLE_LABEL = Object.fromEntries(ART_STYLES.map(s => [s.id, s.label])) as Record<ArtStyle, string>;

export const ROLE_LABEL: Record<CharacterRole, string> = {
  main: 'Nhân vật chính',
  support: 'Nhân vật phụ',
  villain: 'Phản diện',
  extra: 'Quần chúng',
};

export const EXPRESSIONS: Expression[] = ['happy', 'sad', 'angry', 'surprised', 'scared', 'shy'];

export const EXPRESSION_LABEL: Record<Expression, string> = {
  happy: 'Vui',
  sad: 'Buồn',
  angry: 'Giận',
  surprised: 'Ngạc nhiên',
  scared: 'Sợ',
  shy: 'Ngượng',
};

export const WORLD_TYPES: WorldType[] = ['place', 'faction', 'term', 'event', 'note'];

export const WORLD_TYPE_LABEL: Record<WorldType, string> = {
  place: 'Địa danh',
  faction: 'Phe phái',
  term: 'Thuật ngữ',
  event: 'Sự kiện',
  note: 'Ghi chú',
};

export const BLOCK_TYPES: BlockType[] = ['setting', 'action', 'dialogue', 'narration', 'sfx'];

export const BLOCK_LABEL: Record<BlockType, string> = {
  setting: 'Bối cảnh',
  action: 'Hành động',
  dialogue: 'Thoại',
  narration: 'Lời dẫn',
  sfx: 'SFX',
};

export const DIALOGUE_KINDS: DialogueKind[] = ['speak', 'think', 'shout', 'whisper'];

export const DIALOGUE_KIND_LABEL: Record<DialogueKind, string> = {
  speak: 'nói',
  think: 'nghĩ',
  shout: 'hét',
  whisper: 'thì thầm',
};

export const SHOTS: Shot[] = ['wide', 'medium', 'close', 'extreme', 'high', 'low'];

export const SHOT_LABEL: Record<Shot, string> = {
  wide: 'Toàn',
  medium: 'Trung',
  close: 'Cận',
  extreme: 'Đặc tả',
  high: 'Từ trên',
  low: 'Từ dưới',
};

export const BUBBLE_TYPE_LABEL: Record<BubbleType, string> = {
  speak: 'Nói',
  think: 'Nghĩ',
  shout: 'Hét',
  whisper: 'Thì thầm',
  machine: 'Máy móc',
  narration: 'Lời dẫn',
  sfx: 'SFX',
};

export const EFFECT_LABEL: Record<EffectType, string> = {
  speed: 'Đường tốc độ',
  focus: 'Đường tập trung',
  tone: 'Chấm tram',
  gradient: 'Gradient',
  sparkle: 'Lấp lánh',
};

export const PAGE_STATUS_LABEL: Record<PageStatus, string> = {
  empty: 'Trống',
  paneled: 'Đã chia khung',
  drawing: 'Đang vẽ',
  done: 'Xong',
};

export const CHAPTER_STATUS_LABEL: Record<ChapterStatus, string> = {
  unwritten: 'Chưa viết',
  writing: 'Đang viết',
  drawing: 'Đang vẽ',
  done: 'Xong',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: 'Nháp',
  active: 'Đang làm',
  done: 'Hoàn thành',
};

export const DEFAULT_ACT_TITLES = ['Hồi 1 · Mở đầu', 'Hồi 2 · Phát triển', 'Hồi 3 · Kết'];

export const LIMITS = {
  projectTitle: 60,
  logline: 200,
  genresPerProject: 3,
  favoriteGenres: 5,
  chapterTitle: 60,
  chapterSummary: 300,
  characterName: 30,
  characterTraits: 8,
  appearance: 400,
  bio: 1000,
  worldImages: 6,
  layers: 8,
  undoSteps: 50,
  scriptVersions: 20,
  longDialogue: 80,
  blocksPerPage: 5,
  trashDays: 30,
} as const;

export const DAILY_TIPS = [
  'Một trang manga thường có 4 đến 6 khung. Cảnh hành động dùng nhiều khung nhỏ, cảnh cảm xúc dùng khung lớn.',
  'Đặt bong bóng thoại theo đường mắt đọc: từ phải sang trái, từ trên xuống dưới.',
  'Khung cuối trang nên để lại một câu hỏi, người đọc sẽ muốn lật trang.',
  'Thoại quá 80 ký tự thường khó vừa một bong bóng. Hãy tách làm hai.',
  'Phác thảo bằng bút chì trên một lớp riêng, rồi đi nét mực ở lớp phía trên.',
  'Khung tràn lề tạo cảm giác rộng lớn, hợp với cảnh mở đầu hoặc cao trào.',
  'Mỗi nhân vật nên có một cách nói riêng. Đọc to lời thoại lên để kiểm tra.',
  'Đường tốc độ hướng về tâm khung làm người đọc chú ý ngay vào nhân vật.',
  'Viết mục tiêu của chương trước khi viết kịch bản: nhân vật muốn gì, điều gì thay đổi.',
  'Xen kẽ khung cận mặt và khung toàn cảnh để trang truyện có nhịp.',
];
