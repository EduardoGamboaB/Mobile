# Supabase · legado V1 (no usar)

Estas migraciones son de la V1, cuando G3 Drive hablaba directo con Supabase.
Desde la unificación, **el backend NestJS de `backend/` es la única fuente de
verdad** de G3 Drive y G3 Admin; la app móvil ya no incluye el cliente de
Supabase.

Se conservan solo como referencia para migrar datos históricos. Los estados de
viaje de la V1 se traducen al vocabulario único con `fromLegacyTripStatus()`
de `@g3/contracts` (`finished → closed`; el resto coincide).
