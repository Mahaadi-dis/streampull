/**
 * Chromium mirrors native child views (like the built-in browser's page view) horizontally when the operating
 * system's UI language is right-to-left — Arabic Windows, for example. A view placed at x then shows up at
 * `parentWidth - x - width`, so it has to be positioned with the mirrored x to end up where the layout wants it.
 */
const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb'])

/** Is this UI locale (e.g. "ar", "ar-SA", "he_IL") a right-to-left one? */
export const isRtlLocale = (locale: string): boolean => RTL_LANGUAGES.has(locale.toLowerCase().split(/[-_]/)[0])

/** The x to hand to a native view so that it ends up at `x` once Chromium mirrors it. */
export const mirrorX = (x: number, width: number, parentWidth: number): number => parentWidth - x - width
