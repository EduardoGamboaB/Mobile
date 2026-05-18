-- BigQuery · data lake schemas para G3.
-- Estas tablas alimentan el scoring engine y los modelos predictivos
-- (Fase 5 del roadmap: servicios financieros para aseguradoras / leasing).

CREATE TABLE IF NOT EXISTS `g3_warehouse.events_raw` (
  event_id        STRING NOT NULL,
  event_type      STRING NOT NULL,
  company_id      STRING NOT NULL,
  payload         JSON,
  ingested_at     TIMESTAMP NOT NULL,
  source          STRING
)
PARTITION BY DATE(ingested_at)
CLUSTER BY company_id, event_type;

CREATE TABLE IF NOT EXISTS `g3_warehouse.trips_facts` (
  trip_id            STRING NOT NULL,
  company_id         STRING NOT NULL,
  driver_id          STRING,
  tractor_id         STRING,
  trailer_id         STRING,
  client             STRING,
  origin             STRING,
  destination        STRING,
  status             STRING,
  tons               NUMERIC,
  gross_amount_mxn   NUMERIC,
  driver_commission  NUMERIC,
  tolls              NUMERIC,
  diesel             NUMERIC,
  inspection_pct     INT64,
  on_time            BOOL,
  load_date          TIMESTAMP,
  finished_at        TIMESTAMP,
  ingested_at        TIMESTAMP
)
PARTITION BY DATE(load_date)
CLUSTER BY company_id, driver_id;

CREATE TABLE IF NOT EXISTS `g3_warehouse.driver_scoring_daily` (
  driver_id        STRING NOT NULL,
  company_id       STRING NOT NULL,
  day              DATE NOT NULL,
  trips_completed  INT64,
  on_time_pct      NUMERIC,
  km_per_liter     NUMERIC,
  incidents_count  INT64,
  inspection_avg   NUMERIC,
  score            INT64
)
PARTITION BY day
CLUSTER BY company_id, driver_id;

CREATE TABLE IF NOT EXISTS `g3_warehouse.alerts_raw` (
  alert_id      STRING NOT NULL,
  company_id    STRING NOT NULL,
  source        STRING,
  severity      STRING,
  entity_id     STRING,
  title         STRING,
  detail        STRING,
  created_at    TIMESTAMP
)
PARTITION BY DATE(created_at)
CLUSTER BY company_id, severity;

-- Vista para el scoring engine: features por chofer últimos 30 días.
CREATE OR REPLACE VIEW `g3_warehouse.v_driver_features_30d` AS
SELECT
  driver_id,
  company_id,
  COUNT(*)                                 AS trips_30d,
  AVG(CAST(on_time AS INT64)) * 100        AS on_time_pct,
  AVG(km_per_liter)                        AS km_per_liter_avg,
  AVG(inspection_pct)                      AS inspection_avg,
  SUM(gross_amount_mxn)                    AS revenue_30d_mxn
FROM `g3_warehouse.trips_facts`
WHERE load_date >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY driver_id, company_id;
