import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import { useColors } from '@/theme';

/** SF Symbols on iOS, Material Symbols on Android. */
export type IconName = { sf: SFSymbol; md: AndroidSymbol };

/**
 * The light theme's colours, fixed. Screens use useColors() (src/theme),
 * which follows light or dark; this stays for things outside any screen.
 */
export const brandColors = {
  brand: '#0051A2',
  navy: '#1D3557',
  alert: '#EB1E25',
  alertInk: '#B42318',
  leaf: '#2E9E5B',
  leafInk: '#1F6B3D',
  amberInk: '#8A3B00',
  muted: '#4B5563',
  faint: '#8592A3',
  edge: '#C9D3E0',
  white: '#FFFFFF',
  page: '#F6F8FB',
} as const;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const colors = useColors();
  return <SymbolView name={{ ios: name.sf, android: name.md }} size={size} tintColor={color ?? colors.brand} />;
}

/** Icons used in more than one place. */
export const icons = {
  bolt: { sf: 'bolt.fill', md: 'bolt' },
  wrench: { sf: 'wrench.and.screwdriver.fill', md: 'build' },
  phone: { sf: 'phone.fill', md: 'call' },
  map: { sf: 'map.fill', md: 'map' },
  pin: { sf: 'mappin.and.ellipse', md: 'location_on' },
  location: { sf: 'location.fill', md: 'my_location' },
  check: { sf: 'checkmark.circle.fill', md: 'check_circle' },
  clock: { sf: 'clock.fill', md: 'schedule' },
  cart: { sf: 'cart.fill', md: 'shopping_cart' },
  bag: { sf: 'bag.fill', md: 'shopping_bag' },
  doc: { sf: 'doc.text.fill', md: 'description' },
  card: { sf: 'creditcard.fill', md: 'credit_card' },
  shield: { sf: 'shield.lefthalf.filled', md: 'shield' },
  heart: { sf: 'heart.text.square.fill', md: 'health_and_safety' },
  megaphone: { sf: 'megaphone.fill', md: 'campaign' },
  bell: { sf: 'bell.fill', md: 'notifications' },
  person: { sf: 'person.crop.circle.fill', md: 'account_circle' },
  people: { sf: 'person.3.fill', md: 'groups' },
  lock: { sf: 'lock.fill', md: 'lock' },
  key: { sf: 'key.fill', md: 'key' },
  camera: { sf: 'camera.fill', md: 'photo_camera' },
  photo: { sf: 'photo.fill', md: 'image' },
  plus: { sf: 'plus', md: 'add' },
  minus: { sf: 'minus', md: 'remove' },
  close: { sf: 'xmark', md: 'close' },
  trash: { sf: 'trash.fill', md: 'delete' },
  edit: { sf: 'pencil', md: 'edit' },
  search: { sf: 'magnifyingglass', md: 'search' },
  chevron: { sf: 'chevron.right', md: 'chevron_right' },
  info: { sf: 'info.circle.fill', md: 'info' },
  warning: { sf: 'exclamationmark.triangle.fill', md: 'warning' },
  truck: { sf: 'truck.box.fill', md: 'local_shipping' },
  box: { sf: 'shippingbox.fill', md: 'inventory_2' },
  money: { sf: 'banknote.fill', md: 'payments' },
  chart: { sf: 'chart.bar.fill', md: 'insights' },
  seal: { sf: 'checkmark.seal.fill', md: 'verified' },
  home: { sf: 'house.fill', md: 'home' },
  globe: { sf: 'globe', md: 'language' },
  download: { sf: 'arrow.down.doc.fill', md: 'download' },
  logout: { sf: 'rectangle.portrait.and.arrow.right', md: 'logout' },
  send: { sf: 'paperplane.fill', md: 'send' },
  calendar: { sf: 'calendar', md: 'calendar_month' },
  list: { sf: 'list.bullet.rectangle.fill', md: 'receipt_long' },
  sparkles: { sf: 'sparkles', md: 'auto_awesome' },
  book: { sf: 'book.fill', md: 'menu_book' },
  eye: { sf: 'eye.fill', md: 'visibility' },
  building: { sf: 'building.2.fill', md: 'apartment' },
  handshake: { sf: 'person.2.fill', md: 'handshake' },
  quote: { sf: 'doc.plaintext.fill', md: 'request_quote' },
  phoneDevice: { sf: 'iphone', md: 'smartphone' },
  tag: { sf: 'tag.fill', md: 'sell' },
  arrowUp: { sf: 'arrow.up.right', md: 'north_east' },
  play: { sf: 'car.fill', md: 'directions_car' },
  flag: { sf: 'flag.checkered', md: 'sports_score' },
  inbox: { sf: 'tray.fill', md: 'inbox' },
  logbook: { sf: 'book.closed.fill', md: 'import_contacts' },
  checklist: { sf: 'checklist', md: 'checklist' },
  eyeTrouble: { sf: 'eye.trianglebadge.exclamationmark.fill', md: 'report' },
  server: { sf: 'server.rack', md: 'dns' },
  history: { sf: 'clock.arrow.circlepath', md: 'history' },
  grid: { sf: 'square.grid.2x2.fill', md: 'dashboard' },
} satisfies Record<string, IconName>;
