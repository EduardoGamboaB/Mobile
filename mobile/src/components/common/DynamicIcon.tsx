import React from 'react';
import * as Icons from '@/components/icons';
import type { IconProps } from '@/components/icons';

const map: Record<string, React.FC<IconProps>> = {
  navArrow:     Icons.NavArrowIcon,
  package:      Icons.PackageIcon,
  pause:        Icons.PauseIcon,
  cone:         Icons.ConeIcon,
  fuel:         Icons.FuelIcon,
  alert:        Icons.AlertIcon,
  flag:         Icons.FlagIcon,
  checkCircle:  Icons.CheckCircleIcon,
  settings:     Icons.SettingsIcon,
  badge:        Icons.BadgeIcon,
  clock:        Icons.ClockIcon,
  user:         Icons.UserIcon,
  lock:         Icons.LockIcon,
  info:         Icons.InfoIcon,
  file:         Icons.FileIcon,
  scale:        Icons.ScaleIcon,
  receipt:      Icons.ReceiptIcon,
  mapPin:       Icons.MapPinIcon,
  camera:       Icons.CameraIcon,
};

interface Props extends IconProps {
  name: string;
}

export const DynamicIcon: React.FC<Props> = ({ name, ...rest }) => {
  const Component = map[name] ?? Icons.InfoIcon;
  return <Component {...rest} />;
};
