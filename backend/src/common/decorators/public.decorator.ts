import { SetMetadata } from '@nestjs/common';

/** Marca endpoints públicos (sin JWT). */
export const PUBLIC_KEY = 'g3:public';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
