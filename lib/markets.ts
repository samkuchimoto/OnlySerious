// /lib/markets.ts
//
// Country Hubs — the audit's "Geographic and cultural segmentation must
// be elevated to a primary navigational control."
//
// Phase 1 ships Thailand, the Philippines and Vietnam. Indonesia and
// Malaysia are Phase 4 in the roadmap and are deliberately absent
// rather than listed-and-empty: a hub switch that always returns "no
// one here" teaches people the switch is broken.
//
// ---------------------------------------------------------------------
// Why matching is by alias rather than by code.
//
// `UserProfile.country` was a free-text input for the whole of the
// pre-launch period, so the existing rows hold "Thailand", "thailand",
// "TH", "ประเทศไทย" and at least one "Bangkok, Thailand". The sign-up
// form now offers a select, which fixes new rows — but a hub that only
// understood the clean values would silently hide every member who
// joined before it, which is all of them.
//
// So each market carries the spellings it actually answers to, matched
// case- and whitespace-insensitively, and anything unrecognised falls
// into the "All" hub rather than disappearing.
// ---------------------------------------------------------------------

export type MarketId = "all" | "th" | "ph" | "vn";

export interface Market {
  id: MarketId;
  /** Shown on the hub switch. */
  label: string;
  /** The canonical value written to new profiles. */
  country: string;
  /** Spellings seen in existing data, lowercased. */
  aliases: string[];
  /** Header photograph for the hub, from the supplied brief imagery. */
  image: string;
  /** The cities the audit names as this market's primary split. */
  cities: string[];
}

export const MARKETS: Market[] = [
  {
    id: "th",
    label: "Thailand",
    country: "Thailand",
    aliases: ["thailand", "th", "tha", "ประเทศไทย", "ไทย", "siam", "kingdom of thailand"],
    image: "/scenes/market-thailand.webp",
    cities: ["Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Khon Kaen", "Udon Thani"],
  },
  {
    id: "ph",
    label: "Philippines",
    country: "Philippines",
    aliases: [
      "philippines",
      "ph",
      "phl",
      "pilipinas",
      "the philippines",
      "republic of the philippines",
    ],
    image: "/scenes/market-philippines.webp",
    cities: ["Metro Manila", "Cebu", "Davao", "Iloilo", "Baguio", "Angeles"],
  },
  {
    id: "vn",
    label: "Vietnam",
    country: "Vietnam",
    aliases: ["vietnam", "viet nam", "vn", "vnm", "việt nam", "viet-nam"],
    image: "/scenes/market-vietnam.webp",
    cities: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Hai Phong", "Nha Trang", "Hue"],
  },
];

/** The switch itself, with "All" first — the default, so nobody has to
 *  pick a country before they are allowed to see anybody. */
export const MARKET_TABS: { id: MarketId; label: string }[] = [
  { id: "all", label: "All" },
  ...MARKETS.map((m) => ({ id: m.id, label: m.label })),
];

export function marketById(id: MarketId): Market | undefined {
  return MARKETS.find((m) => m.id === id);
}

/** Which hub a free-text country string belongs to, or null if none. */
export function marketFor(country: string | undefined): Market | null {
  if (!country) return null;
  const needle = country.trim().toLowerCase();
  if (!needle) return null;
  return (
    MARKETS.find(
      (m) =>
        m.aliases.includes(needle) ||
        // "Bangkok, Thailand" and "Cebu City, Philippines" both occur in
        // the existing rows. A suffix check catches them without letting
        // a bare city name match a country it merely sits inside.
        m.aliases.some((a) => needle.endsWith(`, ${a}`) || needle.endsWith(` ${a}`)),
    ) ?? null
  );
}

export function isInMarket(country: string | undefined, market: MarketId): boolean {
  if (market === "all") return true;
  return marketFor(country)?.id === market;
}

/** Countries offered in the sign-up select. Members outside the launch
 *  markets are not turned away — "Other" keeps the field honest rather
 *  than forcing someone to misstate where they live. */
export const COUNTRY_OPTIONS = [...MARKETS.map((m) => m.country), "Other"];
