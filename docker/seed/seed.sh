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
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ne_110m_admin_0_countries');")

if [ "$DATA_EXISTS" = "t" ]; then
  echo "Data already exists. Skipping seed."
  exit 0
fi

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
  -lco FID=gid

# Load cities
ogr2ogr -f PostgreSQL \
  PG:"host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" \
  ne_110m_populated_places.shp \
  -nln ne_110m_populated_places \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid

# Load rivers
ogr2ogr -f PostgreSQL \
  PG:"host=$PGHOST port=$PGPORT dbname=$PGDATABASE user=$PGUSER password=$PGPASSWORD" \
  ne_110m_rivers_lake_centerlines.shp \
  -nln ne_110m_rivers_lake_centerlines \
  -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=geom \
  -lco FID=gid

echo "Creating spatial indexes..."
psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" <<-EOSQL
  CREATE INDEX IF NOT EXISTS idx_countries_geom ON ne_110m_admin_0_countries USING GIST (geom);
  CREATE INDEX IF NOT EXISTS idx_cities_geom ON ne_110m_populated_places USING GIST (geom);
  CREATE INDEX IF NOT EXISTS idx_rivers_geom ON ne_110m_rivers_lake_centerlines USING GIST (geom);
EOSQL

echo "Seed completed successfully!"

# Cleanup
cd /
rm -rf /tmp/naturalearth
