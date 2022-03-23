import tintify from '../colors';

const AZURE = '#0482d8';

describe('tintify()', () => {
  it('generates tints from a base color', () => {
    const result = tintify(AZURE);

    expect(result).toEqual({
      '100': '#e6f3fb',
      '200': '#c0e0f5',
      '300': '#9bcdef',
      '400': '#4fa8e4',
      '50': '#f2f9fd',
      '500': '#0482d8',
      '600': '#0475c2',
      '700': '#0362a2',
      '800': '#024e82',
      '900': '#02406a',
    });
  });
});
