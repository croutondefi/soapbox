import {
  Map as ImmutableMap,
  List as ImmutableList,
  Record as ImmutableRecord,
  fromJS,
} from 'immutable';
import trimStart from 'lodash/trimStart';

import { toTailwind } from 'soapbox/utils/tailwind';
import { generateAccent } from 'soapbox/utils/theme';

import { normalizeAd } from './ad';

import type {
  Ad,
  PromoPanelItem,
  FooterItem,
  CryptoAddress,
} from 'soapbox/types/soapbox';

const DEFAULT_COLORS = ImmutableMap<string, any>({
  success: ImmutableMap({
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  }),
  danger: ImmutableMap({
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  }),
  'sea-blue': '#2feecc',
  'greentext': '#789922',
});

export const PromoPanelItemRecord = ImmutableRecord({
  icon: '',
  text: '',
  url: '',
  textLocales: ImmutableMap<string, string>(),
});

export const PromoPanelRecord = ImmutableRecord({
  items: ImmutableList<PromoPanelItem>(),
});

export const FooterItemRecord = ImmutableRecord({
  title: '',
  url: '',
});

export const CryptoAddressRecord = ImmutableRecord({
  address: '',
  note: '',
  ticker: '',
});

export const SoapboxConfigRecord = ImmutableRecord({
  ads: ImmutableList<Ad>(),
  appleAppId: null,
  authProvider: '',
  logo: '',
  logoDarkMode: null,
  banner: '',
  brandColor: '', // Empty
  accentColor: '',
  colors: ImmutableMap(),
  copyright: `♥${new Date().getFullYear()}. github.com/croutondefi. Please share.`,
  customCss: ImmutableList<string>(),
  defaultSettings: ImmutableMap<string, any>(),
  extensions: ImmutableMap(),
  gdpr: false,
  gdprUrl: '',
  greentext: false,
  promoPanel: PromoPanelRecord(),
  navlinks: ImmutableMap({
    homeFooter: ImmutableList<FooterItem>(),
  }),
  allowedEmoji: ImmutableList<string>([
    '👍',
    '❤️',
    '😆',
    '😮',
    '😢',
    '😩',
  ]),
  verifiedIcon: '',
  verifiedCanEditName: false,
  displayFqn: true,
  cryptoAddresses: ImmutableList<CryptoAddress>(),
  cryptoDonatePanel: ImmutableMap({
    limit: 1,
  }),
  aboutPages: ImmutableMap<string, ImmutableMap<string, unknown>>(),
  authenticatedProfile: true,
  singleUserMode: false,
  singleUserModeProfile: '',
  linkFooterMessage: '',
  links: ImmutableMap<string, string>(),
  displayCta: true,
  /** Whether to inject suggested profiles into the Home feed. */
  feedInjection: true,
  tileServer: '',
  tileServerAttribution: '',
  isBeta: true,
}, 'SoapboxConfig');

type SoapboxConfigMap = ImmutableMap<string, any>;

const normalizeAds = (soapboxConfig: SoapboxConfigMap): SoapboxConfigMap => {
  const ads = ImmutableList<Record<string, any>>(soapboxConfig.get('ads'));
  return soapboxConfig.set('ads', ads.map(normalizeAd));
};

const normalizeCryptoAddress = (address: unknown): CryptoAddress => {
  return CryptoAddressRecord(ImmutableMap(fromJS(address))).update('ticker', ticker => {
    return trimStart(ticker, '$').toLowerCase();
  });
};

const normalizeCryptoAddresses = (soapboxConfig: SoapboxConfigMap): SoapboxConfigMap => {
  const addresses = ImmutableList(soapboxConfig.get('cryptoAddresses'));
  return soapboxConfig.set('cryptoAddresses', addresses.map(normalizeCryptoAddress));
};

const normalizeBrandColor = (soapboxConfig: SoapboxConfigMap): SoapboxConfigMap => {
  const brandColor = soapboxConfig.get('brandColor') || soapboxConfig.getIn(['colors', 'primary', '500']) || '';
  return soapboxConfig.set('brandColor', brandColor);
};

const normalizeAccentColor = (soapboxConfig: SoapboxConfigMap): SoapboxConfigMap => {
  const brandColor = soapboxConfig.get('brandColor');

  const accentColor = soapboxConfig.get('accentColor')
    || soapboxConfig.getIn(['colors', 'accent', '500'])
    || (brandColor ? generateAccent(brandColor) : '');

  return soapboxConfig.set('accentColor', accentColor);
};

const normalizeColors = (soapboxConfig: SoapboxConfigMap): SoapboxConfigMap => {
  const colors = DEFAULT_COLORS.mergeDeep(soapboxConfig.get('colors'));
  return toTailwind(soapboxConfig.set('colors', colors));
};

const maybeAddMissingColors = (soapboxConfig: SoapboxConfigMap): SoapboxConfigMap => {
  const colors = soapboxConfig.get('colors');

  const missing = ImmutableMap({
    'gradient-start': colors.getIn(['primary', '500']),
    'gradient-end': colors.getIn(['accent', '500']),
    'accent-blue': colors.getIn(['primary', '600']),
  });

  return soapboxConfig.set('colors', missing.mergeDeep(colors));
};

const normalizePromoPanel = (soapboxConfig: SoapboxConfigMap): SoapboxConfigMap => {
  const promoPanel = PromoPanelRecord(soapboxConfig.get('promoPanel'));
  const items = promoPanel.items.map(PromoPanelItemRecord);
  return soapboxConfig.set('promoPanel', promoPanel.set('items', items));
};

const normalizeFooterLinks = (soapboxConfig: SoapboxConfigMap): SoapboxConfigMap => {
  const path = ['navlinks', 'homeFooter'];
  const items = (soapboxConfig.getIn(path, ImmutableList()) as ImmutableList<any>).map(FooterItemRecord);
  return soapboxConfig.setIn(path, items);
};

/** Migrate legacy ads config. */
const normalizeAdsAlgorithm = (soapboxConfig: SoapboxConfigMap): SoapboxConfigMap => {
  const interval = soapboxConfig.getIn(['extensions', 'ads', 'interval']);
  const algorithm = soapboxConfig.getIn(['extensions', 'ads', 'algorithm']);

  if (typeof interval === 'number' && !algorithm) {
    const result = fromJS(['linear', { interval }]);
    return soapboxConfig.setIn(['extensions', 'ads', 'algorithm'], result);
  } else {
    return soapboxConfig;
  }
};

export const normalizeSoapboxConfig = (soapboxConfig: Record<string, any>) => {
  return SoapboxConfigRecord(
    ImmutableMap(fromJS(soapboxConfig)).withMutations(soapboxConfig => {
      normalizeBrandColor(soapboxConfig);
      normalizeAccentColor(soapboxConfig);
      normalizeColors(soapboxConfig);
      normalizePromoPanel(soapboxConfig);
      normalizeFooterLinks(soapboxConfig);
      maybeAddMissingColors(soapboxConfig);
      normalizeCryptoAddresses(soapboxConfig);
      normalizeAds(soapboxConfig);
      normalizeAdsAlgorithm(soapboxConfig);
    }),
  );
};
