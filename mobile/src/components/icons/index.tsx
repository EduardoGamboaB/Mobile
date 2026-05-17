import React from 'react';
import Svg, { Path, Polyline, Polygon, Circle, Line, Rect } from 'react-native-svg';
import { colors } from '@/theme';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const Base: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 22,
  color = colors.text,
  strokeWidth = 1.75,
  children,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </Svg>
);

/* ────────────────────────────── Navigation ────────────────────────────── */
export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <Polyline points="9 22 9 12 15 12 15 22" />
  </Base>
);

export const TruckIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <Path d="M15 18H9" />
    <Path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <Circle cx={17} cy={18} r={2} />
    <Circle cx={7} cy={18} r={2} />
  </Base>
);

export const ClipboardIcon = (p: IconProps) => (
  <Base {...p}>
    <Rect x={8} y={2} width={8} height={4} rx={1} />
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <Path d="M9 12h6" />
    <Path d="M9 16h4" />
  </Base>
);

export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx={12} cy={7} r={4} />
  </Base>
);

/* ────────────────────────────── Travel ────────────────────────────── */
export const MapPinIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0Z" />
    <Circle cx={12} cy={10} r={3} />
  </Base>
);

export const FuelIcon = (p: IconProps) => (
  <Base {...p}>
    <Line x1={3} y1={22} x2={15} y2={22} />
    <Line x1={4} y1={9} x2={14} y2={9} />
    <Path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
    <Path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
  </Base>
);

export const PauseIcon = (p: IconProps) => (
  <Base {...p}>
    <Rect x={6} y={4} width={4} height={16} />
    <Rect x={14} y={4} width={4} height={16} />
  </Base>
);

export const NavArrowIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M12 19V5" />
    <Polyline points="5 12 12 5 19 12" />
  </Base>
);

export const FlagIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <Line x1={4} y1={22} x2={4} y2={15} />
  </Base>
);

export const PackageIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="m7.5 4.27 9 5.15" />
    <Path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <Path d="m3.3 7 8.7 5 8.7-5" />
    <Line x1={12} y1={22} x2={12} y2={12} />
  </Base>
);

export const ConeIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M16.05 10.966a5 5 0 0 1 2.42 4.4" />
    <Path d="M5.5 15.366a5 5 0 0 1 2.42-4.4" />
    <Path d="M8 21h8" />
    <Path d="m10.5 3-3.5 18" />
    <Path d="m13.5 3 3.5 18" />
  </Base>
);

export const CompassIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={10} />
    <Polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </Base>
);

/* ────────────────────────────── Status ────────────────────────────── */
export const AlertIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
    <Line x1={12} y1={9} x2={12} y2={13} />
    <Line x1={12} y1={17} x2={12.01} y2={17} />
  </Base>
);

export const AlertOctagonIcon = (p: IconProps) => (
  <Base {...p}>
    <Polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <Line x1={12} y1={8} x2={12} y2={12} />
    <Line x1={12} y1={16} x2={12.01} y2={16} />
  </Base>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <Polyline points="22 4 12 14.01 9 11.01" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="20 6 9 17 4 12" />
  </Base>
);

export const XIcon = (p: IconProps) => (
  <Base {...p}>
    <Line x1={18} y1={6} x2={6} y2={18} />
    <Line x1={6} y1={6} x2={18} y2={18} />
  </Base>
);

export const InfoIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={10} />
    <Line x1={12} y1={16} x2={12} y2={12} />
    <Line x1={12} y1={8} x2={12.01} y2={8} />
  </Base>
);

/* ────────────────────────────── UI ────────────────────────────── */
export const CameraIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <Circle cx={12} cy={13} r={3} />
  </Base>
);

export const ImageIcon = (p: IconProps) => (
  <Base {...p}>
    <Rect x={3} y={3} width={18} height={18} rx={2} />
    <Circle cx={8.5} cy={8.5} r={1.5} />
    <Polyline points="21 15 16 10 5 21" />
  </Base>
);

export const BellIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Base>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="9 18 15 12 9 6" />
  </Base>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="15 18 9 12 15 6" />
  </Base>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="6 9 12 15 18 9" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <Line x1={12} y1={5} x2={12} y2={19} />
    <Line x1={5} y1={12} x2={19} y2={12} />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={11} cy={11} r={8} />
    <Line x1={21} y1={21} x2={16.65} y2={16.65} />
  </Base>
);

export const SettingsIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={3} />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 9 4.6V4.5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V11a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Base>
);

export const FilterIcon = (p: IconProps) => (
  <Base {...p}>
    <Polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </Base>
);

export const MoreHIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={1} />
    <Circle cx={19} cy={12} r={1} />
    <Circle cx={5} cy={12} r={1} />
  </Base>
);

export const EditIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </Base>
);

export const SendIcon = (p: IconProps) => (
  <Base {...p}>
    <Line x1={22} y1={2} x2={11} y2={13} />
    <Polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Base>
);

export const RefreshIcon = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="23 4 23 10 17 10" />
    <Polyline points="1 20 1 14 7 14" />
    <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <Path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </Base>
);

export const LogOutIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1={21} y1={12} x2={9} y2={12} />
  </Base>
);

/* ────────────────────────────── Contact / Docs ────────────────────────────── */
export const PhoneIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </Base>
);

export const MailIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Polyline points="22,6 12,13 2,6" />
  </Base>
);

export const LockIcon = (p: IconProps) => (
  <Base {...p}>
    <Rect x={3} y={11} width={18} height={11} rx={2} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Base>
);

export const IdCardIcon = (p: IconProps) => (
  <Base {...p}>
    <Rect x={2} y={5} width={20} height={14} rx={2} />
    <Circle cx={9} cy={12} r={2.5} />
    <Path d="M14 11h5" />
    <Path d="M14 14h4" />
  </Base>
);

export const FileIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <Polyline points="14 2 14 8 20 8" />
    <Line x1={9} y1={13} x2={15} y2={13} />
    <Line x1={9} y1={17} x2={15} y2={17} />
  </Base>
);

export const BuildingIcon = (p: IconProps) => (
  <Base {...p}>
    <Rect x={3} y={3} width={18} height={18} rx={2} />
    <Path d="M9 8h.01" />
    <Path d="M15 8h.01" />
    <Path d="M9 12h.01" />
    <Path d="M15 12h.01" />
    <Path d="M9 16h.01" />
    <Path d="M15 16h.01" />
  </Base>
);

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <Rect x={3} y={4} width={18} height={18} rx={2} />
    <Line x1={16} y1={2} x2={16} y2={6} />
    <Line x1={8} y1={2} x2={8} y2={6} />
    <Line x1={3} y1={10} x2={21} y2={10} />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={10} />
    <Polyline points="12 6 12 12 16 14" />
  </Base>
);

/* ────────────────────────────── Money ────────────────────────────── */
export const DollarIcon = (p: IconProps) => (
  <Base {...p}>
    <Line x1={12} y1={1} x2={12} y2={23} />
    <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Base>
);

export const CreditCardIcon = (p: IconProps) => (
  <Base {...p}>
    <Rect x={1} y={4} width={22} height={16} rx={2} />
    <Line x1={1} y1={10} x2={23} y2={10} />
  </Base>
);

export const TrendingUpIcon = (p: IconProps) => (
  <Base {...p}>
    <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <Polyline points="17 6 23 6 23 12" />
  </Base>
);

/* ────────────────────────────── Network / state ────────────────────────────── */
export const CloudIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </Base>
);

export const CloudOffIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3" />
    <Line x1={1} y1={1} x2={23} y2={23} />
  </Base>
);

export const WifiOffIcon = (p: IconProps) => (
  <Base {...p}>
    <Line x1={1} y1={1} x2={23} y2={23} />
    <Path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <Path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <Path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <Path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <Line x1={12} y1={20} x2={12.01} y2={20} />
  </Base>
);

/* ────────────────────────────── Misc ────────────────────────────── */
export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Base>
);

export const GlobeIcon = (p: IconProps) => (
  <Base {...p}>
    <Circle cx={12} cy={12} r={10} />
    <Line x1={2} y1={12} x2={22} y2={12} />
    <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Base>
);

export const QrIcon = (p: IconProps) => (
  <Base {...p}>
    <Rect x={3} y={3} width={7} height={7} rx={1} />
    <Rect x={14} y={3} width={7} height={7} rx={1} />
    <Rect x={3} y={14} width={7} height={7} rx={1} />
    <Line x1={14} y1={14} x2={14} y2={17} />
    <Line x1={17} y1={14} x2={20} y2={14} />
    <Line x1={17} y1={17} x2={17} y2={21} />
    <Line x1={14} y1={20} x2={17} y2={20} />
    <Line x1={20} y1={17} x2={20} y2={21} />
  </Base>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Polyline points="9 12 11 14 15 10" />
  </Base>
);

export const MessageIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </Base>
);

export const SparklesIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M12 3l1.9 5.8L20 11l-5.8 1.9L12 19l-1.9-5.8L4 11l5.8-2L12 3z" />
    <Path d="M19 17l.7 2.2L22 20l-2.3 1L19 23l-.7-2-2.3-1 2.3-.8z" />
  </Base>
);

export const PaperclipIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </Base>
);

export const MicIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <Line x1={12} y1={19} x2={12} y2={23} />
    <Line x1={8} y1={23} x2={16} y2={23} />
  </Base>
);

export const ScaleIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <Path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <Path d="M7 21h10" />
    <Path d="M12 3v18" />
    <Path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </Base>
);

export const ReceiptIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2Z" />
    <Path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    <Path d="M12 17.5v-11" />
  </Base>
);

export const BadgeIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    <Path d="M5 17.05A8 8 0 1 1 12 21l-2-3 3-2-3-2 2-3a8 8 0 0 1-7 6.05z" />
  </Base>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Base {...p}>
    <Line x1={12} y1={5} x2={12} y2={19} />
    <Polyline points="19 12 12 19 5 12" />
  </Base>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Base {...p}>
    <Line x1={5} y1={12} x2={19} y2={12} />
    <Polyline points="12 5 19 12 12 19" />
  </Base>
);

export const LayersIcon = (p: IconProps) => (
  <Base {...p}>
    <Polygon points="12 2 2 7 12 12 22 7 12 2" />
    <Polyline points="2 17 12 22 22 17" />
    <Polyline points="2 12 12 17 22 12" />
  </Base>
);

export const LocateIcon = (p: IconProps) => (
  <Base {...p}>
    <Line x1={2} y1={12} x2={5} y2={12} />
    <Line x1={19} y1={12} x2={22} y2={12} />
    <Line x1={12} y1={2} x2={12} y2={5} />
    <Line x1={12} y1={19} x2={12} y2={22} />
    <Circle cx={12} cy={12} r={7} />
    <Circle cx={12} cy={12} r={3} />
  </Base>
);

export const ZapIcon = (p: IconProps) => (
  <Base {...p}>
    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </Base>
);

export const PowerIcon = (p: IconProps) => (
  <Base {...p}>
    <Path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <Line x1={12} y1={2} x2={12} y2={12} />
  </Base>
);
