import { describe, it, expect } from 'vitest';
import { isSafeZipEntry, isShapefileSidecar } from './unzip.js';

const dest = '/tmp/ingest-abc';

describe('isSafeZipEntry (zip-slip guard)', () => {
  it('accepts normal entries inside the dir', () => {
    expect(isSafeZipEntry(dest, 'parcels.shp')).toBe(true);
    expect(isSafeZipEntry(dest, 'sub/parcels.shp')).toBe(true);
  });

  it('rejects path traversal', () => {
    expect(isSafeZipEntry(dest, '../evil.shp')).toBe(false);
    expect(isSafeZipEntry(dest, '../../etc/passwd')).toBe(false);
    expect(isSafeZipEntry(dest, 'sub/../../evil')).toBe(false);
  });

  it('rejects absolute paths', () => {
    expect(isSafeZipEntry(dest, '/etc/passwd')).toBe(false);
  });

  it('rejects the dir itself', () => {
    expect(isSafeZipEntry(dest, '')).toBe(false);
  });
});

describe('isShapefileSidecar', () => {
  it('accepts shapefile sidecar extensions', () => {
    for (const ext of ['.shp', '.shx', '.dbf', '.prj', '.cpg']) {
      expect(isShapefileSidecar(`parcels${ext}`)).toBe(true);
    }
  });

  it('rejects everything else', () => {
    expect(isShapefileSidecar('readme.txt')).toBe(false);
    expect(isShapefileSidecar('evil.exe')).toBe(false);
    expect(isShapefileSidecar('nested.zip')).toBe(false);
  });
});
