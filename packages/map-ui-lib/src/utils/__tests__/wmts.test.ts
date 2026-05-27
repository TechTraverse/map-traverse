// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  buildWmtsTileUrlTemplate,
  adaptResourceUrlTemplate,
  parseWmtsCapabilities,
} from '../wmts';

describe('buildWmtsTileUrlTemplate', () => {
  it('builds a {z}/{y}/{x} template from a capabilities URL', () => {
    const url = buildWmtsTileUrlTemplate(
      'https://example.com/wmts/GetCapabilities.xml',
      'MyLayer',
      'default',
      'WebMercatorQuad',
      'image/png',
    );
    expect(url).toBe('https://example.com/wmts/MyLayer/default/WebMercatorQuad/{z}/{y}/{x}.png');
  });

  it('strips a trailing slash and query string from the capabilities URL', () => {
    const url = buildWmtsTileUrlTemplate(
      'https://example.com/wmts/?service=WMTS&request=GetCapabilities',
      'L',
      'default',
      'WebMercatorQuad',
      'image/jpeg',
    );
    expect(url).toBe('https://example.com/wmts/L/default/WebMercatorQuad/{z}/{y}/{x}.jpg');
  });

  it('maps image/jpeg to the jpg extension', () => {
    const url = buildWmtsTileUrlTemplate(
      'https://example.com/wmts/GetCapabilities.xml',
      'L',
      'default',
      'WebMercatorQuad',
      'image/jpeg',
    );
    expect(url.endsWith('.jpg')).toBe(true);
  });

  it('appends query-param auth', () => {
    const url = buildWmtsTileUrlTemplate(
      'https://example.com/wmts/GetCapabilities.xml',
      'L',
      'default',
      'WebMercatorQuad',
      'image/png',
      { type: 'query_param', name: 'key', value: 'secret' },
    );
    expect(url).toMatch(/\?key=secret$/);
  });
});

describe('adaptResourceUrlTemplate', () => {
  it('replaces WMTS placeholders with MapLibre placeholders', () => {
    const out = adaptResourceUrlTemplate(
      'https://e.com/L/default/WMQ/{TileMatrix}/{TileRow}/{TileCol}.png',
    );
    expect(out).toBe('https://e.com/L/default/WMQ/{z}/{y}/{x}.png');
  });

  it('is case-insensitive', () => {
    const out = adaptResourceUrlTemplate(
      'https://e.com/{tilematrix}/{tilerow}/{tilecol}.png',
    );
    expect(out).toBe('https://e.com/{z}/{y}/{x}.png');
  });
});

describe('parseWmtsCapabilities', () => {
  const minimalCapabilities = `<?xml version="1.0"?>
<Capabilities xmlns="http://www.opengis.net/wmts/1.0">
  <Contents>
    <Layer>
      <Identifier>L1</Identifier>
      <Title>Layer One</Title>
      <Style>
        <Identifier>default</Identifier>
      </Style>
      <Format>image/png</Format>
      <Format>image/jpeg</Format>
      <TileMatrixSetLink>
        <TileMatrixSet>WebMercatorQuad</TileMatrixSet>
      </TileMatrixSetLink>
    </Layer>
  </Contents>
</Capabilities>`;

  it('extracts layers with styles, formats, and tile matrix sets', () => {
    const caps = parseWmtsCapabilities(minimalCapabilities);
    expect(caps.layers).toHaveLength(1);
    const layer = caps.layers[0];
    expect(layer.id).toBe('L1');
    expect(layer.title).toBe('Layer One');
    expect(layer.styles).toEqual(['default']);
    expect(layer.formats).toEqual(['image/png', 'image/jpeg']);
    expect(layer.tileMatrixSets).toEqual(['WebMercatorQuad']);
  });

  it('throws a clear error on invalid XML', () => {
    expect(() => parseWmtsCapabilities('not xml at all <<<')).toThrow(/not valid XML/);
  });
});
