import { memo, type ComponentType } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Icon của app: tên giữ theo Lucide (để code các màn không phải đổi), nhưng
 * vẽ bằng font Material Icons — đúng bộ icon app Flutter gốc dùng.
 * File sinh bởi scripts/gen-icons.py — thêm icon thì sửa bảng MAP trong script rồi chạy lại.
 * Font: android/app/src/main/assets/fonts/MaterialIcons-Regular.ttf (Apache 2.0).
 */

export type IconProps = {
  size?: number | string;
  color?: string;
  /** Có fill (khác trong suốt) thì dùng bản đặc của icon nếu có. */
  fill?: string;
  /** Giữ để tương thích API cũ; font icon không có nét. */
  strokeWidth?: number;
  stroke?: string;
  style?: StyleProp<ViewStyle | TextStyle>;
  accessibilityLabel?: string;
};

export type IconComponent = ComponentType<IconProps>;
/** Tên cũ, để các chỗ khai báo kiểu `LucideIcon` không phải đổi. */
export type LucideIcon = IconComponent;

const GLYPHS = {
  add: 0xe145,
  add_box: 0xe146,
  arrow_back: 0xe5c4,
  arrow_downward: 0xe5db,
  arrow_forward: 0xe5c8,
  arrow_upward: 0xe5d8,
  article: 0xef42,
  auto_awesome: 0xe65f,
  autorenew: 0xe863,
  backup: 0xe864,
  balance: 0xeaf6,
  bar_chart: 0xe26b,
  block: 0xe14b,
  bolt: 0xea0b,
  bookmark: 0xe866,
  bookmark_add: 0xe598,
  bookmark_added: 0xe599,
  bookmark_border: 0xe867,
  bookmark_remove: 0xe59a,
  bookmarks: 0xe98b,
  brightness_low: 0xe1ad,
  brightness_medium: 0xe1ae,
  brush: 0xe3ae,
  calendar_today: 0xe935,
  call_to_action: 0xe06c,
  cancel: 0xe5c9,
  chat_bubble: 0xe0ca,
  chat_bubble_outline: 0xe0cb,
  check: 0xe5ca,
  check_circle: 0xe86c,
  check_circle_outline: 0xe92d,
  checklist: 0xe6b1,
  chevron_left: 0xe5cb,
  chevron_right: 0xe5cc,
  circle: 0xef4a,
  cleaning_services: 0xf0ff,
  close: 0xe5cd,
  cloud_download: 0xe2c0,
  cloud_off: 0xe2c1,
  code: 0xe86f,
  content_copy: 0xe14d,
  contrast: 0xeb37,
  cookie: 0xeaac,
  create_new_folder: 0xe2cc,
  crop_portrait: 0xe3c5,
  crop_square: 0xe3c6,
  dark_mode: 0xe51c,
  date_range: 0xe916,
  delete: 0xe872,
  delete_outline: 0xe92e,
  description: 0xe873,
  desktop_windows: 0xe30c,
  devices: 0xe1b1,
  done_all: 0xe877,
  download: 0xf090,
  drive_file_move: 0xe675,
  edit: 0xe3c9,
  emoji_events: 0xea23,
  error: 0xe000,
  error_outline: 0xe001,
  expand_less: 0xe5ce,
  expand_more: 0xe5cf,
  explore: 0xe87a,
  extension: 0xe87b,
  favorite: 0xe87d,
  favorite_border: 0xe87e,
  filter_alt: 0xef4f,
  filter_list: 0xe152,
  flashlight_off: 0xf00a,
  flashlight_on: 0xf00b,
  folder_open: 0xe2c8,
  format_align_justify: 0xe235,
  format_list_bulleted: 0xe241,
  format_list_numbered: 0xe242,
  format_size: 0xe245,
  fullscreen: 0xe5d0,
  fullscreen_exit: 0xe5d1,
  gpp_bad: 0xf012,
  gpp_maybe: 0xf014,
  grid_view: 0xe9b0,
  headphones: 0xf01f,
  help: 0xe887,
  help_outline: 0xe8fd,
  hide_image: 0xf022,
  highlight_off: 0xe888,
  history: 0xe889,
  home: 0xe88a,
  horizontal_rule: 0xf108,
  horizontal_split: 0xe947,
  hourglass_empty: 0xe88b,
  image: 0xe3f4,
  info: 0xe88e,
  info_outline: 0xe88f,
  insert_drive_file: 0xe24d,
  layers: 0xe53b,
  library_add_check: 0xe9b7,
  light_mode: 0xe518,
  lightbulb: 0xe0f0,
  lightbulb_outline: 0xe90f,
  link: 0xe157,
  local_fire_department: 0xef55,
  local_library: 0xe54b,
  lock: 0xe897,
  lock_open: 0xe898,
  mail: 0xe158,
  mail_outline: 0xe0e1,
  menu: 0xe5d2,
  menu_book: 0xea19,
  more_horiz: 0xe5d3,
  more_vert: 0xe5d4,
  movie: 0xe02c,
  music_note: 0xe405,
  new_releases: 0xe031,
  newspaper: 0xeb81,
  no_photography: 0xf1a8,
  north_west: 0xf1e2,
  notifications: 0xe7f4,
  notifications_none: 0xe7f5,
  open_in_full: 0xf1ce,
  open_in_new: 0xe89e,
  palette: 0xe40a,
  pan_tool: 0xe925,
  pause: 0xe034,
  pause_circle: 0xe1a2,
  pause_circle_outline: 0xe036,
  person: 0xe7fd,
  person_outline: 0xe7ff,
  pie_chart_outline: 0xf044,
  play_arrow: 0xe037,
  play_circle: 0xe1c4,
  play_circle_outline: 0xe039,
  power_off: 0xe646,
  power_settings_new: 0xe8ac,
  public: 0xe80b,
  push_pin: 0xf10d,
  qr_code: 0xef6b,
  qr_code_scanner: 0xf206,
  radio_button_unchecked: 0xe836,
  refresh: 0xe5d5,
  remove: 0xe15b,
  remove_moderator: 0xe9d4,
  repeat: 0xe040,
  replay: 0xe042,
  rocket_launch: 0xeb9b,
  save: 0xe161,
  schedule: 0xe8b5,
  screen_lock_landscape: 0xe1be,
  screen_lock_portrait: 0xe1bf,
  screen_lock_rotation: 0xe1c0,
  screen_rotation: 0xe1c1,
  search: 0xe8b6,
  search_off: 0xea76,
  sell: 0xf05b,
  send: 0xe163,
  settings: 0xe8b8,
  share: 0xe80d,
  shield: 0xe9e0,
  skip_next: 0xe044,
  skip_previous: 0xe045,
  smartphone: 0xe32c,
  sort: 0xe164,
  speed: 0xe9e4,
  star: 0xe838,
  star_border: 0xe83a,
  sticky_note_2: 0xf1fc,
  stop: 0xe047,
  stop_circle: 0xef71,
  storage: 0xe1db,
  swap_horiz: 0xe8d4,
  swap_vert: 0xe8d5,
  tablet: 0xe32f,
  text_decrease: 0xeadd,
  text_fields: 0xe262,
  text_increase: 0xeae2,
  timeline: 0xe922,
  timer: 0xe425,
  touch_app: 0xe913,
  translate: 0xe8e2,
  trending_up: 0xe8e5,
  tune: 0xe429,
  undo: 0xe166,
  unfold_more: 0xe5d7,
  upload: 0xf09b,
  upload_file: 0xe9fc,
  verified_user: 0xe8e8,
  view_agenda: 0xe8e9,
  view_carousel: 0xe8eb,
  view_column: 0xe8ec,
  view_day: 0xe8ed,
  visibility: 0xe8f4,
  visibility_off: 0xe8f5,
  volume_off: 0xe04f,
  volume_up: 0xe050,
  warning: 0xe002,
  warning_amber: 0xf083,
  web_asset: 0xe069,
  wifi: 0xe63e,
  wifi_off: 0xe648,
  wrap_text: 0xe25b,
} as const;

type GlyphName = keyof typeof GLYPHS;

function isFilled(fill: string | undefined): boolean {
  return !!fill && fill !== 'none' && fill !== 'transparent';
}

function create(glyph: GlyphName, filled?: GlyphName): IconComponent {
  function MaterialIcon({ size = 24, color = '#000', fill, style, accessibilityLabel }: IconProps) {
    const px = Number(size);
    const name = filled && isFilled(fill) ? filled : glyph;
    return (
      <Text
        allowFontScaling={false}
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
        style={[styles.icon, { fontSize: px, lineHeight: px, width: px, height: px, color }, style as StyleProp<TextStyle>]}
      >
        {String.fromCodePoint(GLYPHS[name])}
      </Text>
    );
  }
  return memo(MaterialIcon);
}

export const AArrowDown = create('text_decrease');
export const AArrowUp = create('text_increase');
export const ALargeSmall = create('format_size');
export const Activity = create('timeline');
export const AlignJustify = create('format_align_justify');
export const AppWindow = create('web_asset');
export const ArrowDown = create('arrow_downward');
export const ArrowDownUp = create('swap_vert');
export const ArrowDownWideNarrow = create('sort');
export const ArrowLeft = create('arrow_back');
export const ArrowLeftRight = create('swap_horiz');
export const ArrowRight = create('arrow_forward');
export const ArrowUp = create('arrow_upward');
export const ArrowUpDown = create('swap_vert');
export const ArrowUpLeft = create('north_west');
export const ArrowUpNarrowWide = create('sort');
export const BadgeAlert = create('new_releases');
export const Ban = create('block');
export const BarChart3 = create('bar_chart');
export const Bell = create('notifications_none', 'notifications');
export const BookCheck = create('library_add_check');
export const BookMarked = create('bookmarks');
export const BookOpen = create('menu_book');
export const BookOpenText = create('menu_book');
export const Bookmark = create('bookmark_border', 'bookmark');
export const BookmarkCheck = create('bookmark_added');
export const BookmarkMinus = create('bookmark_remove');
export const BookmarkPlus = create('bookmark_add', 'bookmark_added');
export const Brush = create('brush');
export const Calendar = create('calendar_today');
export const CalendarDays = create('date_range');
export const CameraOff = create('no_photography');
export const ChartColumn = create('bar_chart');
export const ChartPie = create('pie_chart_outline');
export const Check = create('check');
export const CheckCheck = create('done_all');
export const ChevronDown = create('expand_more');
export const ChevronLeft = create('chevron_left');
export const ChevronRight = create('chevron_right');
export const ChevronUp = create('expand_less');
export const Circle = create('radio_button_unchecked', 'circle');
export const CircleAlert = create('error_outline', 'error');
export const CircleCheck = create('check_circle_outline', 'check_circle');
export const CircleHelp = create('help_outline', 'help');
export const CirclePause = create('pause_circle_outline', 'pause_circle');
export const CirclePlay = create('play_circle_outline', 'play_circle');
export const CircleStop = create('stop_circle');
export const CircleX = create('highlight_off', 'cancel');
export const Clock = create('schedule');
export const Clock3 = create('schedule');
export const CloudDownload = create('cloud_download');
export const CloudOff = create('cloud_off');
export const CodeXml = create('code');
export const Columns2 = create('view_column');
export const Compass = create('explore');
export const Contrast = create('contrast');
export const Cookie = create('cookie');
export const Copy = create('content_copy');
export const Database = create('storage');
export const DatabaseBackup = create('backup');
export const Download = create('download');
export const Ellipsis = create('more_horiz');
export const EllipsisVertical = create('more_vert');
export const Eraser = create('cleaning_services');
export const Expand = create('open_in_full');
export const ExternalLink = create('open_in_new');
export const Eye = create('visibility');
export const EyeOff = create('visibility_off');
export const File = create('insert_drive_file');
export const FileText = create('description');
export const FileUp = create('upload_file');
export const FileX = create('insert_drive_file');
export const Film = create('movie');
export const Filter = create('filter_alt');
export const Flame = create('local_fire_department');
export const Flashlight = create('flashlight_on');
export const FlashlightOff = create('flashlight_off');
export const FolderInput = create('drive_file_move');
export const FolderOpen = create('folder_open');
export const FolderPlus = create('create_new_folder');
export const GalleryHorizontal = create('view_carousel');
export const GalleryVertical = create('view_day');
export const Gauge = create('speed');
export const Globe = create('public');
export const Grid2x2 = create('grid_view');
export const Hand = create('pan_tool');
export const Headphones = create('headphones');
export const Heart = create('favorite_border', 'favorite');
export const History = create('history');
export const Hourglass = create('hourglass_empty');
export const House = create('home');
export const Image = create('image');
export const ImageOff = create('hide_image');
export const Info = create('info_outline', 'info');
export const Languages = create('translate');
export const Layers = create('layers');
export const LayoutGrid = create('grid_view');
export const Library = create('local_library');
export const LibraryBig = create('local_library');
export const Lightbulb = create('lightbulb_outline', 'lightbulb');
export const Link = create('link');
export const List = create('format_list_bulleted');
export const ListChecks = create('checklist');
export const ListFilter = create('filter_list');
export const ListOrdered = create('format_list_numbered');
export const LoaderCircle = create('autorenew');
export const Lock = create('lock');
export const LockOpen = create('lock_open');
export const Mail = create('mail_outline', 'mail');
export const Maximize = create('fullscreen');
export const Maximize2 = create('fullscreen');
export const Menu = create('menu');
export const MessageCircle = create('chat_bubble_outline', 'chat_bubble');
export const Minimize2 = create('fullscreen_exit');
export const Minus = create('remove');
export const Monitor = create('desktop_windows');
export const MonitorSmartphone = create('devices');
export const Moon = create('dark_mode');
export const MousePointerClick = create('touch_app');
export const Music = create('music_note');
export const Newspaper = create('newspaper');
export const Palette = create('palette');
export const PanelBottom = create('call_to_action');
export const PanelTop = create('web_asset');
export const Pause = create('pause');
export const Pencil = create('edit');
export const Pin = create('push_pin');
export const Play = create('play_arrow');
export const Plus = create('add');
export const Power = create('power_settings_new');
export const PowerOff = create('power_off');
export const Puzzle = create('extension');
export const QrCode = create('qr_code');
export const RectangleVertical = create('crop_portrait');
export const RefreshCw = create('refresh');
export const Repeat = create('repeat');
export const Rocket = create('rocket_launch');
export const RotateCcw = create('replay');
export const RotateCw = create('refresh');
export const Rows3 = create('view_agenda');
export const Save = create('save');
export const Scale = create('balance');
export const ScanQrCode = create('qr_code_scanner');
export const ScreenLockLandscape = create('screen_lock_landscape');
export const ScreenLockPortrait = create('screen_lock_portrait');
export const ScreenRotation = create('screen_rotation');
export const ScreenShare = create('screen_rotation');
export const ScreenShareOff = create('screen_lock_rotation');
export const ScrollText = create('article');
export const Search = create('search');
export const SearchX = create('search_off');
export const Send = create('send');
export const SeparatorHorizontal = create('horizontal_rule');
export const Settings = create('settings');
export const Settings2 = create('tune');
export const Share = create('share');
export const Share2 = create('share');
export const Shield = create('shield');
export const ShieldAlert = create('gpp_maybe');
export const ShieldBan = create('gpp_bad');
export const ShieldCheck = create('verified_user');
export const ShieldOff = create('remove_moderator');
export const SkipBack = create('skip_previous');
export const SkipForward = create('skip_next');
export const SlidersHorizontal = create('tune');
export const Smartphone = create('smartphone');
export const Sparkles = create('auto_awesome');
export const Square = create('crop_square', 'stop');
export const SquareArrowOutUpRight = create('open_in_new');
export const SquarePlus = create('add_box');
export const SquareSplitVertical = create('horizontal_split');
export const Star = create('star_border', 'star');
export const StickyNote = create('sticky_note_2');
export const Sun = create('light_mode');
export const SunDim = create('brightness_low');
export const SunMedium = create('brightness_medium');
export const Tablet = create('tablet');
export const Tags = create('sell');
export const TextWrap = create('wrap_text');
export const Timer = create('timer');
export const Trash = create('delete_outline', 'delete');
export const Trash2 = create('delete_outline', 'delete');
export const TrendingUp = create('trending_up');
export const TriangleAlert = create('warning_amber', 'warning');
export const Trophy = create('emoji_events');
export const Type = create('text_fields');
export const Undo2 = create('undo');
export const UnfoldVertical = create('unfold_more');
export const Upload = create('upload');
export const User = create('person_outline', 'person');
export const VenetianMask = create('visibility_off');
export const Volume2 = create('volume_up');
export const VolumeX = create('volume_off');
export const Wifi = create('wifi');
export const WifiOff = create('wifi_off');
export const X = create('close');
export const Zap = create('bolt');

const styles = StyleSheet.create({
  icon: { fontFamily: 'MaterialIcons-Regular', textAlign: 'center', includeFontPadding: false },
});
