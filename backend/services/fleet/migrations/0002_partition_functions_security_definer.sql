-- El rol de runtime (g3_fleet) no es dueño del schema (lo es g3_fleet_migrator)
-- y por eso no podía crear particiones de telemetría al vuelo: un punto de un
-- mes sin partición fallaba la ingesta. Las funciones de CREACIÓN corren con
-- los privilegios del dueño (SECURITY DEFINER, search_path fijo); el runtime
-- solo puede crear particiones mensuales de telemetry_points, nada más.
-- El borrado (retención) queda exclusivo del dueño (job de mantenimiento).
ALTER FUNCTION telemetry_ensure_partition(timestamptz) SECURITY DEFINER;
ALTER FUNCTION telemetry_ensure_partitions(timestamptz, timestamptz) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION telemetry_drop_partitions_before(timestamptz) FROM PUBLIC;
