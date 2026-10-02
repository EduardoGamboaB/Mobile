import { isDemo, demoStore } from '@/demo';
import type { Profile } from '@/models';
import { driversApi } from './g3/drivers';
import type { AuthSession, DriverDTO } from './g3/types';

type SessionUser = AuthSession['user'];

/** Perfil base a partir del usuario autenticado (owner/admin no tienen registro de chofer). */
export function profileFromUser(user: SessionUser, extra: Partial<Profile> = {}): Profile {
  return {
    id: user.id,
    company_id: user.companyId,
    role: user.role === 'driver' ? 'driver' : 'admin',
    full_name: user.email,
    phone: null,
    email: user.email,
    federal_license: null,
    license_expires_at: null,
    assigned_unit_number: null,
    unit_type: null,
    tractor_plates: null,
    trailer_plates: null,
    status: 'active',
    photo_url: null,
    ...extra,
  };
}

function withDriver(user: SessionUser, d: DriverDTO): Profile {
  return profileFromUser(user, {
    full_name: d.fullName,
    phone: d.phone,
    email: d.email ?? user.email,
    federal_license: d.federalLicense,
    license_expires_at: d.licenseExpiresAt,
    status: d.status === 'inactive' ? 'suspended' : d.status,
  });
}

/** Choferes: perfil desde `/drivers/me`; el resto, desde el JWT. */
export async function getMyProfile(user: SessionUser): Promise<Profile> {
  if (isDemo) return demoStore.getProfile();
  if (user.role !== 'driver' || !user.driverId) return profileFromUser(user);
  return withDriver(user, await driversApi.me());
}

export async function updateMyProfile(
  user: SessionUser,
  patch: Pick<Partial<Profile>, 'phone' | 'email'>,
): Promise<Profile> {
  if (isDemo) return demoStore.patchProfile(patch);
  return withDriver(
    user,
    await driversApi.updateMe({
      ...(patch.phone !== undefined ? { phone: patch.phone ?? '' } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
    }),
  );
}
