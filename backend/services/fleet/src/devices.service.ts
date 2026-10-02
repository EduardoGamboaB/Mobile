import { v4 as uuid } from 'uuid';
import {
  isTelemetryProvider,
  type CreateDeviceDto,
  type DeviceDto,
  type LinkDeviceDto,
  type UpdateDeviceDto,
} from '@g3/contracts';
import type { RequestCtx } from './fleet.service';
import type { InMemoryDeviceRepo, InMemoryTractorRepo, InMemoryTrailerRepo } from './in-memory.repos';
import { ConflictError, NotFoundError, ValidationError } from './errors';

/**
 * Dispositivos GPS (propios o de terceros) y su vínculo a un vehículo.
 * Un vehículo puede tener más de un dispositivo (ej. GPS del cliente + uno
 * de G3); un dispositivo apunta a lo más a un vehículo.
 */
export class DevicesService {
  constructor(
    private readonly devices: InMemoryDeviceRepo,
    private readonly tractors: InMemoryTractorRepo,
    private readonly trailers: InMemoryTrailerRepo,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  list(ctx: RequestCtx) {
    return this.devices.list(ctx.companyId);
  }

  async get(ctx: RequestCtx, id: string): Promise<DeviceDto> {
    const d = await this.devices.findById(ctx.companyId, id);
    if (!d) throw new NotFoundError('Dispositivo no encontrado');
    return d;
  }

  async create(ctx: RequestCtx, input: CreateDeviceDto): Promise<DeviceDto> {
    if (!isTelemetryProvider(input?.provider)) {
      throw new ValidationError('provider debe ser suntech | teltonika | queclink | generic');
    }
    const externalId = typeof input.externalId === 'string' ? input.externalId.trim() : '';
    if (!externalId || externalId.length > 64) {
      throw new ValidationError('externalId (IMEI / ID de equipo) es requerido y ≤ 64 caracteres');
    }
    // Unicidad global: el IMEI enruta la telemetría a UNA compañía. No
    // revelamos a cuál pertenece si es de otra.
    if (await this.devices.findByExternalId(externalId)) {
      throw new ConflictError('Este IMEI / ID de equipo ya está registrado', { externalId });
    }
    const d: DeviceDto = {
      id: uuid(),
      companyId: ctx.companyId,
      provider: input.provider,
      externalId,
      label: input.label?.trim() || null,
      vehicleId: null,
      vehicleKind: null,
      status: 'pending',
      lastSeenAt: null,
      createdAt: this.clock().toISOString(),
    };
    return this.devices.create(d);
  }

  async update(ctx: RequestCtx, id: string, patch: UpdateDeviceDto): Promise<DeviceDto> {
    await this.get(ctx, id);
    const next: Partial<DeviceDto> = {};
    if (patch.label !== undefined) next.label = patch.label?.trim() || null;
    if (patch.status !== undefined) {
      if (patch.status !== 'active' && patch.status !== 'inactive') {
        throw new ValidationError('status debe ser active | inactive');
      }
      next.status = patch.status;
    }
    return (await this.devices.update(ctx.companyId, id, next))!;
  }

  async remove(ctx: RequestCtx, id: string) {
    const ok = await this.devices.remove(ctx.companyId, id);
    if (!ok) throw new NotFoundError('Dispositivo no encontrado');
  }

  async link(ctx: RequestCtx, id: string, input: LinkDeviceDto): Promise<DeviceDto> {
    await this.get(ctx, id);
    if (input?.vehicleKind !== 'tractor' && input?.vehicleKind !== 'trailer') {
      throw new ValidationError('vehicleKind debe ser tractor | trailer');
    }
    const vehicle =
      input.vehicleKind === 'tractor'
        ? await this.tractors.findById(ctx.companyId, input.vehicleId)
        : await this.trailers.findById(ctx.companyId, input.vehicleId);
    if (!vehicle) throw new NotFoundError(`${input.vehicleKind === 'tractor' ? 'Tracto' : 'Remolque'} no encontrado`);
    return (await this.devices.update(ctx.companyId, id, {
      vehicleId: vehicle.id,
      vehicleKind: input.vehicleKind,
    }))!;
  }

  async unlink(ctx: RequestCtx, id: string): Promise<DeviceDto> {
    await this.get(ctx, id);
    return (await this.devices.update(ctx.companyId, id, { vehicleId: null, vehicleKind: null }))!;
  }
}
