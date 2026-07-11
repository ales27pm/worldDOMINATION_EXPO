/**
 * Decorative art for the heraldic hall — bundled with the app so the title
 * screen never shows an empty frame (remote loads could fail mid-session,
 * and RN Image never retries a failed fetch). Sourced from the original
 * web build's art pack in object storage (public/risk/art).
 */
export const ART = {
  warCrest: require("../assets/art/war-crest.webp") as number,
  heroPainting: require("../assets/art/hero-painting.webp") as number,
};
