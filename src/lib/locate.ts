import * as Location from 'expo-location';

export type Located = { lat: number; lng: number; address: string };

/** The phone's position and a best-guess street address. Throws a readable message. */
export async function locateMe(offMessage: string): Promise<Located> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error(offMessage);
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  let address = '';
  try {
    const [place] = await Location.reverseGeocodeAsync(pos.coords);
    if (place) address = [place.streetNumber, place.street ?? place.name, place.district ?? place.subregion].filter(Boolean).join(' ');
  } catch {
    // the pin is enough
  }
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, address };
}
