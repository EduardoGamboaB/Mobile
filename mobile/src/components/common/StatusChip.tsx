import React from 'react';
import { Chip } from './Chip';
import { TripStatusLabel, type TripStatusValue } from '@/constants/enums';

interface Props {
  status: TripStatusValue;
}

const variantFor = (s: TripStatusValue) => {
  switch (s) {
    case 'in_transit': return 'blue' as const;
    case 'closed':     return 'green' as const;
    case 'loading':
    case 'unloading':  return 'amber' as const;
    case 'cancelled':  return 'gray' as const;
    case 'scheduled':
    default:           return 'gray' as const;
  }
};

export function StatusChip({ status }: Props) {
  return <Chip label={TripStatusLabel[status]} variant={variantFor(status)} />;
}
