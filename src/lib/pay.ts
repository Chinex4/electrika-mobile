/**
 * Paying with Paystack. The checkout opens in an in-app browser; Paystack
 * returns to /api/payments/return/, which checks the payment with Paystack
 * itself and then opens electrika://payments/done?result=…
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export type PayResult = 'paid' | 'pending' | 'failed' | 'cancelled';

export async function openCheckout(checkoutUrl: string): Promise<PayResult> {
  // A private session: iOS then skips its "wants to use … to Sign In" prompt,
  // which made no sense before a payment, and nothing is kept between payments.
  const res = await WebBrowser.openAuthSessionAsync(checkoutUrl, 'electrika://payments/done', { preferEphemeralSession: true });
  if (res.type !== 'success') return 'cancelled';
  const result = Linking.parse(res.url).queryParams?.result;
  return result === 'paid' || result === 'pending' || result === 'failed' ? result : 'pending';
}

/** Report links, PDFs and the like: in the in-app browser. */
export function openPage(url: string) {
  return WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
}

export function call(phone: string) {
  return Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
}

export function whatsapp(phone: string) {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '234');
  return Linking.openURL(`https://wa.me/${digits}`);
}

/** Directions in the phone's maps app. */
export function openMaps(lat: number | null | undefined, lng: number | null | undefined, label: string, address?: string) {
  const q = lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(`${address ?? label}, Enugu`);
  return Linking.openURL(
    lat != null && lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`,
  );
}
