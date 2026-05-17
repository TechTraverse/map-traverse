#!/bin/bash
set -e

echo "Starting seed process..."

# Wait for PostgreSQL to be ready
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER"; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Check if data already exists
DATA_EXISTS=$(psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'example' AND table_name = 'ne_110m_admin_0_countries');")

echo "Running admin UI migrations..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f /scripts/init_admin.sql
echo "Admin UI migrations completed!"

echo "Installing normalize-public-ddl triggers..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -f /scripts/init_normalize_triggers.sql
echo "Normalize-public-ddl triggers installed!"

echo "Creating example schema..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c "CREATE SCHEMA IF NOT EXISTS example;"

if [ "$DATA_EXISTS" = "t" ]; then
  echo "Example data already exists. Skipping example seed."
else
  echo "Downloading Natural Earth data..."

  # Create temporary directory
  mkdir -p /tmp/naturalearth
  cd /tmp/naturalearth

  # Download Natural Earth 110m data
  echo "Downloading countries..."
  curl -L -o countries.zip "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip"
  unzip -o countries.zip

  echo "Downloading populated places..."
  curl -L -o cities.zip "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_populated_places.zip"
  unzip -o cities.zip

  echo "Downloading rivers..."
  curl -L -o rivers.zip "https://naciscdn.org/naturalearth/110m/physical/ne_110m_rivers_lake_centerlines.zip"
  unzip -o rivers.zip

  echo "Loading data into PostgreSQL..."

  # Load countries
  ogr2ogr -f PostgreSQL \
    PG:"host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" \
    ne_110m_admin_0_countries.shp \
    -nln ne_110m_admin_0_countries \
    -nlt PROMOTE_TO_MULTI \
    -lco GEOMETRY_NAME=geom \
    -lco FID=gid \
    -lco SCHEMA=example

  # Load cities
  ogr2ogr -f PostgreSQL \
    PG:"host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" \
    ne_110m_populated_places.shp \
    -nln ne_110m_populated_places \
    -lco GEOMETRY_NAME=geom \
    -lco FID=gid \
    -lco SCHEMA=example

  # Load rivers
  ogr2ogr -f PostgreSQL \
    PG:"host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" \
    ne_110m_rivers_lake_centerlines.shp \
    -nln ne_110m_rivers_lake_centerlines \
    -nlt PROMOTE_TO_MULTI \
    -lco GEOMETRY_NAME=geom \
    -lco FID=gid \
    -lco SCHEMA=example

  echo "Creating spatial indexes..."
  psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" <<-EOSQL
    CREATE INDEX IF NOT EXISTS idx_countries_geom ON example.ne_110m_admin_0_countries USING GIST (geom);
    CREATE INDEX IF NOT EXISTS idx_cities_geom ON example.ne_110m_populated_places USING GIST (geom);
    CREATE INDEX IF NOT EXISTS idx_rivers_geom ON example.ne_110m_rivers_lake_centerlines USING GIST (geom);
EOSQL

  echo "Example seed completed successfully!"

  # Cleanup
  cd /
  rm -rf /tmp/naturalearth
fi

# Optional user-provided data loader.
# Drop a script at docker/seed/load-shapefiles.sh (gitignored) to load
# project-specific data. The script is responsible for creating its own
# schemas and using ogr2ogr -overwrite (or equivalent) for idempotency.
# Remember to add any new schemas to TIPG_DB_SCHEMAS (via .env override)
# and to restart tipg afterwards: docker restart storybook-components-tipg
if [ -f /scripts/load-shapefiles.sh ]; then
  echo "Running user-provided data loader: load-shapefiles.sh"
  bash /scripts/load-shapefiles.sh
fi
