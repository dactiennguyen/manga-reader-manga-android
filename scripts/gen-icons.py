"""Sinh src/components/icons.tsx: icon tên kiểu Lucide nhưng vẽ bằng font Material Icons
(cùng bộ icon app Flutter gốc dùng).

Thêm icon: bổ sung vào MAP (tên component -> tên glyph trong
MaterialIcons-Regular.codepoints), rồi chạy `python3 scripts/gen-icons.py`.
Font tương ứng: android/app/src/main/assets/fonts/MaterialIcons-Regular.ttf
(google/material-design-icons, Apache 2.0).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CP_FILE = os.path.join(HERE, 'MaterialIcons-Regular.codepoints')

# Tên Lucide -> (glyph thường, glyph khi có fill)
MAP = {
    'AArrowDown': ('text_decrease', None),
    'AArrowUp': ('text_increase', None),
    'ALargeSmall': ('format_size', None),
    'Activity': ('timeline', None),
    'AlignJustify': ('format_align_justify', None),
    'AppWindow': ('web_asset', None),
    'ArrowDown': ('arrow_downward', None),
    'ArrowDownUp': ('swap_vert', None),
    'ArrowDownWideNarrow': ('sort', None),
    'ArrowLeft': ('arrow_back', None),
    'ArrowLeftRight': ('swap_horiz', None),
    'ArrowRight': ('arrow_forward', None),
    'ArrowUp': ('arrow_upward', None),
    'ArrowUpDown': ('swap_vert', None),
    'ArrowUpLeft': ('north_west', None),
    'ArrowUpNarrowWide': ('sort', None),
    'BadgeAlert': ('new_releases', None),
    'Ban': ('block', None),
    'BarChart3': ('bar_chart', None),
    'Bell': ('notifications_none', 'notifications'),
    'BookCheck': ('library_add_check', None),
    'BookMarked': ('bookmarks', None),
    'BookOpen': ('menu_book', None),
    'BookOpenText': ('menu_book', None),
    'Bookmark': ('bookmark_border', 'bookmark'),
    'BookmarkCheck': ('bookmark_added', None),
    'BookmarkMinus': ('bookmark_remove', None),
    'BookmarkPlus': ('bookmark_add', 'bookmark_added'),
    'Brush': ('brush', None),
    'Calendar': ('calendar_today', None),
    'CalendarDays': ('date_range', None),
    'CameraOff': ('no_photography', None),
    'ChartColumn': ('bar_chart', None),
    'Check': ('check', None),
    'CheckCheck': ('done_all', None),
    'ChevronDown': ('expand_more', None),
    'ChevronLeft': ('chevron_left', None),
    'ChevronRight': ('chevron_right', None),
    'ChevronUp': ('expand_less', None),
    'Circle': ('radio_button_unchecked', 'circle'),
    'CircleAlert': ('error_outline', 'error'),
    'CircleCheck': ('check_circle_outline', 'check_circle'),
    'CircleHelp': ('help_outline', 'help'),
    'CirclePause': ('pause_circle_outline', 'pause_circle'),
    'CirclePlay': ('play_circle_outline', 'play_circle'),
    'CircleStop': ('stop_circle', None),
    'CircleX': ('highlight_off', 'cancel'),
    'Clock': ('schedule', None),
    'Clock3': ('schedule', None),
    'CloudDownload': ('cloud_download', None),
    'CloudOff': ('cloud_off', None),
    'CodeXml': ('code', None),
    'Columns2': ('view_column', None),
    'Compass': ('explore', None),
    'Contrast': ('contrast', None),
    'Cookie': ('cookie', None),
    'Copy': ('content_copy', None),
    'Database': ('storage', None),
    'DatabaseBackup': ('backup', None),
    'Download': ('download', None),
    'Ellipsis': ('more_horiz', None),
    'EllipsisVertical': ('more_vert', None),
    'Eraser': ('cleaning_services', None),
    'Expand': ('open_in_full', None),
    'ExternalLink': ('open_in_new', None),
    'Eye': ('visibility', None),
    'EyeOff': ('visibility_off', None),
    'FileText': ('description', None),
    'FileUp': ('upload_file', None),
    'File': ('insert_drive_file', None),
    'Film': ('movie', None),
    'FileX': ('insert_drive_file', None),
    'Filter': ('filter_alt', None),
    'Flame': ('local_fire_department', None),
    'Flashlight': ('flashlight_on', None),
    'FlashlightOff': ('flashlight_off', None),
    'FolderInput': ('drive_file_move', None),
    'FolderOpen': ('folder_open', None),
    'FolderPlus': ('create_new_folder', None),
    'Gauge': ('speed', None),
    'GalleryHorizontal': ('view_carousel', None),
    'GalleryVertical': ('view_day', None),
    'Globe': ('public', None),
    'Grid2x2': ('grid_view', None),
    'Hand': ('pan_tool', None),
    'Headphones': ('headphones', None),
    'Heart': ('favorite_border', 'favorite'),
    'History': ('history', None),
    'Hourglass': ('hourglass_empty', None),
    'House': ('home', None),
    'Image': ('image', None),
    'ImageOff': ('hide_image', None),
    'Info': ('info_outline', 'info'),
    'Languages': ('translate', None),
    'Layers': ('layers', None),
    'LayoutGrid': ('grid_view', None),
    'Library': ('local_library', None),
    'LibraryBig': ('local_library', None),
    'Lightbulb': ('lightbulb_outline', 'lightbulb'),
    'Link': ('link', None),
    'List': ('format_list_bulleted', None),
    'ListChecks': ('checklist', None),
    'ListFilter': ('filter_list', None),
    'ListOrdered': ('format_list_numbered', None),
    'LoaderCircle': ('autorenew', None),
    'Lock': ('lock', None),
    'LockOpen': ('lock_open', None),
    'Mail': ('mail_outline', 'mail'),
    'Maximize': ('fullscreen', None),
    'Maximize2': ('fullscreen', None),
    'Menu': ('menu', None),
    'MessageCircle': ('chat_bubble_outline', 'chat_bubble'),
    'Minimize2': ('fullscreen_exit', None),
    'Minus': ('remove', None),
    'Monitor': ('desktop_windows', None),
    'MonitorSmartphone': ('devices', None),
    'Moon': ('dark_mode', None),
    'MousePointerClick': ('touch_app', None),
    'Newspaper': ('newspaper', None),
    'Palette': ('palette', None),
    'PanelBottom': ('call_to_action', None),
    'PanelTop': ('web_asset', None),
    'Pause': ('pause', None),
    'Pencil': ('edit', None),
    'Pin': ('push_pin', None),
    'Play': ('play_arrow', None),
    'Plus': ('add', None),
    'Power': ('power_settings_new', None),
    'PowerOff': ('power_off', None),
    'Puzzle': ('extension', None),
    'QrCode': ('qr_code', None),
    'RectangleVertical': ('crop_portrait', None),
    'RefreshCw': ('refresh', None),
    'Repeat': ('repeat', None),
    'Rocket': ('rocket_launch', None),
    'RotateCcw': ('replay', None),
    'RotateCw': ('refresh', None),
    'Rows3': ('view_agenda', None),
    'Save': ('save', None),
    'Scale': ('balance', None),
    'ScanQrCode': ('qr_code_scanner', None),
    'ChartPie': ('pie_chart_outline', None),
    'Music': ('music_note', None),
    'ScreenLockLandscape': ('screen_lock_landscape', None),
    'ScreenLockPortrait': ('screen_lock_portrait', None),
    'ScreenRotation': ('screen_rotation', None),
    'ScreenShare': ('screen_rotation', None),
    'ScreenShareOff': ('screen_lock_rotation', None),
    'ScrollText': ('article', None),
    'Search': ('search', None),
    'SearchX': ('search_off', None),
    'Send': ('send', None),
    'SeparatorHorizontal': ('horizontal_rule', None),
    'Settings': ('settings', None),
    'Settings2': ('tune', None),
    'Share': ('share', None),
    'Share2': ('share', None),
    'Shield': ('shield', None),
    'ShieldAlert': ('gpp_maybe', None),
    'ShieldBan': ('gpp_bad', None),
    'ShieldCheck': ('verified_user', None),
    'ShieldOff': ('remove_moderator', None),
    'SkipBack': ('skip_previous', None),
    'SkipForward': ('skip_next', None),
    'SlidersHorizontal': ('tune', None),
    'Smartphone': ('smartphone', None),
    'Sparkles': ('auto_awesome', None),
    'Square': ('crop_square', 'stop'),
    'SquareArrowOutUpRight': ('open_in_new', None),
    'SquarePlus': ('add_box', None),
    'SquareSplitVertical': ('horizontal_split', None),
    'Star': ('star_border', 'star'),
    'StickyNote': ('sticky_note_2', None),
    'Sun': ('light_mode', None),
    'SunDim': ('brightness_low', None),
    'SunMedium': ('brightness_medium', None),
    'Tablet': ('tablet', None),
    'Tags': ('sell', None),
    'TextWrap': ('wrap_text', None),
    'Timer': ('timer', None),
    'Trash': ('delete_outline', 'delete'),
    'Trash2': ('delete_outline', 'delete'),
    'TrendingUp': ('trending_up', None),
    'TriangleAlert': ('warning_amber', 'warning'),
    'Trophy': ('emoji_events', None),
    'Type': ('text_fields', None),
    'Undo2': ('undo', None),
    'UnfoldVertical': ('unfold_more', None),
    'Upload': ('upload', None),
    'User': ('person_outline', 'person'),
    'VenetianMask': ('visibility_off', None),
    'Volume2': ('volume_up', None),
    'VolumeX': ('volume_off', None),
    'Wifi': ('wifi', None),
    'WifiOff': ('wifi_off', None),
    'X': ('close', None),
    'Zap': ('bolt', None),
}


def main():
    cps = {}
    for line in open(CP_FILE):
        name, code = line.split()
        cps[name] = code
    missing = sorted({g for pair in MAP.values() for g in pair if g and g not in cps})
    if missing:
        sys.exit('Glyph không có trong font: ' + ', '.join(missing))

    glyphs = sorted({g for pair in MAP.values() for g in pair if g})
    lines = []
    lines.append("import { memo, type ComponentType } from 'react';")
    lines.append("import { StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';")
    lines.append('')
    lines.append('export type IconProps = {')
    lines.append('  size?: number | string;')
    lines.append('  color?: string;')
    lines.append('  fill?: string;')
    lines.append('  strokeWidth?: number;')
    lines.append('  stroke?: string;')
    lines.append('  style?: StyleProp<ViewStyle | TextStyle>;')
    lines.append('  accessibilityLabel?: string;')
    lines.append('};')
    lines.append('')
    lines.append('export type IconComponent = ComponentType<IconProps>;')
    lines.append('export type LucideIcon = IconComponent;')
    lines.append('')
    lines.append('const GLYPHS = {')
    for g in glyphs:
        lines.append(f"  {g}: 0x{cps[g]},")
    lines.append('} as const;')
    lines.append('')
    lines.append('type GlyphName = keyof typeof GLYPHS;')
    lines.append('')
    lines.append('function isFilled(fill: string | undefined): boolean {')
    lines.append("  return !!fill && fill !== 'none' && fill !== 'transparent';")
    lines.append('}')
    lines.append('')
    lines.append('function create(glyph: GlyphName, filled?: GlyphName): IconComponent {')
    lines.append("  function MaterialIcon({ size = 24, color = '#000', fill, style, accessibilityLabel }: IconProps) {")
    lines.append('    const px = Number(size);')
    lines.append('    const name = filled && isFilled(fill) ? filled : glyph;')
    lines.append('    return (')
    lines.append('      <Text')
    lines.append('        allowFontScaling={false}')
    lines.append('        accessible={!!accessibilityLabel}')
    lines.append('        accessibilityLabel={accessibilityLabel}')
    lines.append('        style={[styles.icon, { fontSize: px, lineHeight: px, width: px, height: px, color }, style as StyleProp<TextStyle>]}')
    lines.append('      >')
    lines.append('        {String.fromCodePoint(GLYPHS[name])}')
    lines.append('      </Text>')
    lines.append('    );')
    lines.append('  }')
    lines.append('  return memo(MaterialIcon);')
    lines.append('}')
    lines.append('')
    for lucide, (g, f) in sorted(MAP.items()):
        args = f"'{g}'" + (f", '{f}'" if f else '')
        lines.append(f"export const {lucide} = create({args});")
    lines.append('')
    lines.append('const styles = StyleSheet.create({')
    lines.append("  icon: { fontFamily: 'MaterialIcons-Regular', textAlign: 'center', includeFontPadding: false },")
    lines.append('});')
    open(f'{ROOT}/src/components/icons.tsx', 'w').write('\n'.join(lines) + '\n')
    print('ok', len(MAP), 'icons,', len(glyphs), 'glyphs')


if __name__ == '__main__':
    main()
