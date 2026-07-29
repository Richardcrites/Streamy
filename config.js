// UEX Corp SC Widget — configuration
// Fill in your API key from https://uexcorp.space/api/apps/ (Account > My Apps > Create Application).
// The registration form asks for a "Website" — since this widget runs locally as an OBS Browser
// Source, put a URL that identifies the app instead, e.g. your Streamy GitHub repo URL
// (https://github.com/<you>/Streamy) or your Twitch/YouTube channel URL. It's just an identifier,
// not a callback — anything reasonable is accepted.
window.UEX_WIDGET_CONFIG = {
  // Application key ("secret_key") from your UEX "My Apps" page. Sent as a Bearer token.
  // Most read endpoints work without a key too, just at a lower rate limit — leave blank to try that first.
  apiKey: "aa5e5402c38bb7f2f81419f32a5dba09946deed9",

  // How often to re-fetch data from UEX, in minutes.
  refreshMinutes: 5,

  // How often to rotate between the three panels, in seconds.
  rotationSeconds: 12,

  // Commodity price ticker: how many top commodities to show, ranked by best current sell price.
  commodityTicker: {
    limit: 5,
  },

  // Best trade route panel: leave both null for "best route currently available anywhere".
  // Set originTerminalId to restrict to routes starting from a specific terminal (UEX terminal id).
  tradeRoute: {
    originTerminalId: null,
    commodityId: null,
  },

  // Ship price tracker: exact in-game ship name as listed on UEX (e.g. "Cutlass Black", "Constellation Andromeda").
  ship: {
    name: "Cutlass Black",
  },
};
