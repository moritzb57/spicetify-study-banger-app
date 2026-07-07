import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./css/app.module.scss";

interface Props {
  onEndStudy: () => void;
}

type TimerMode = "work" | "break";
type ViewMode = "dashboard" | "focus";

interface TimerSettings {
  workMinutes: number;
  breakMinutes: number;
}

interface TimerPreset {
  id: string;
  label: string;
  description: string;
  workMinutes: number;
  breakMinutes: number;
}

interface FocusDisplaySettings {
  showMode: boolean;
  showSong: boolean;
  showClock: boolean;
  showDate: boolean;
  showControls: boolean;
  showMusicControls: boolean;
}

interface Playlist {
  id: string;
  title: string;
  description: string;
  uri: string;
  tag: string;
  coverUrl?: string;
}

interface PlaylistArtwork {
  title?: string;
  description?: string;
  owner?: string;
  imageUrl?: string;
  expiresAt: number;
}

interface CurrentTrack {
  title: string;
  artist: string;
}

interface PlaybackSnapshot {
  contextUri?: string;
  trackUri?: string;
  wasPaused: boolean;
  shouldRestore: boolean;
}

interface DomPlaylistDetails {
  title?: string;
  coverUrl?: string;
}

interface PlayerEventTarget {
  addEventListener?: (event: string, callback: () => void) => void;
  removeEventListener?: (event: string, callback: () => void) => void;
}

interface SpicetifyReactDomLike {
  render?: (element: React.ReactElement, container: Element) => void;
  unmountComponentAtNode?: (container: Element) => void;
}

interface FocusPlayerControls {
  togglePlay?: () => void | Promise<void>;
  pause?: () => void | Promise<void>;
  resume?: () => void | Promise<void>;
  next?: () => void | Promise<void>;
  back?: () => void | Promise<void>;
  setVolume?: (volume: number) => void | Promise<void>;
  getVolume?: () => number;
  data?: {
    isPaused?: boolean;
  };
}

interface PlaylistApiLike {
  getMetadata?: (uri: string) => Promise<unknown>;
}

interface CosmosAsyncLike {
  get?: <T = unknown>(url: string) => Promise<T>;
}

interface SpicetifyExtended {
  Platform?: {
    PlaylistAPI?: PlaylistApiLike;
  };
  CosmosAsync?: CosmosAsyncLike;
}

const SETTINGS_STORAGE_KEY = "study-banger:timer-settings";
const ACTIVE_DURATION_STORAGE_KEY = "study-banger:active-duration-id";
const DISPLAY_STORAGE_KEY = "study-banger:focus-display-settings";
const CUSTOM_PLAYLISTS_STORAGE_KEY = "study-banger:custom-playlists";
const PLAYLIST_ARTWORK_CACHE_KEY = "study-banger:playlist-artwork-cache";
const PLAYLIST_ARTWORK_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const TIMER_PRESETS: TimerPreset[] = [
  {
    id: "classic",
    label: "25 / 5",
    description: "Classic Pomodoro",
    workMinutes: 25,
    breakMinutes: 5,
  },
  {
    id: "deep",
    label: "50 / 10",
    description: "Deep work",
    workMinutes: 50,
    breakMinutes: 10,
  },
  {
    id: "quick",
    label: "15 / 3",
    description: "Quick sprint",
    workMinutes: 15,
    breakMinutes: 3,
  },
  {
    id: "long",
    label: "90 / 15",
    description: "Long block",
    workMinutes: 90,
    breakMinutes: 15,
  },
];

const DEFAULT_SETTINGS: TimerSettings = {
  workMinutes: TIMER_PRESETS[0].workMinutes,
  breakMinutes: TIMER_PRESETS[0].breakMinutes,
};

const DEFAULT_DISPLAY_SETTINGS: FocusDisplaySettings = {
  showMode: false,
  showSong: true,
  showClock: false,
  showDate: false,
  showControls: true,
  showMusicControls: true,
};

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: "classical-study-or-sleep",
    title: "Classical music to study or sleep",
    description: "Original Study Banger playlist.",
    uri: "spotify:playlist:5cwPclg5ZtafoBPWgZMHMb",
    tag: "Original",
    coverUrl: "https://i2o.scdn.co/image/ab67706c0000cfa33dcdcb8727cd0038e662f4c4",
  },
  {
    id: "classical-bangers",
    title: "classical bangers",
    description: "Original Study Banger playlist.",
    uri: "spotify:playlist:27Zm1P410dPfedsdoO9fqm",
    tag: "Original",
    coverUrl: "https://i2o.scdn.co/image/ab67706c0000cfa3434a1c3fd09a2e8a26f57397",
  },
  {
    id: "lofi-study-2024",
    title: "Lofi study 2024",
    description: "Original Study Banger playlist.",
    uri: "spotify:playlist:6zCID88oNjNv9zx6puDHKj",
    tag: "Original",
    coverUrl: "https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84e8fcb214bcd7d054018d9fe4",
  },
  {
    id: "deep-focus",
    title: "Deep Focus",
    description: "Minimal instrumental focus music.",
    uri: "spotify:playlist:37i9dQZF1DWZeKCadgRdKQ",
    tag: "Spotify",
  },
  {
    id: "instrumental-study",
    title: "Instrumental Study",
    description: "Instrumental tracks for concentrated sessions.",
    uri: "spotify:playlist:37i9dQZF1DX9sIqqvKsjG8",
    tag: "Spotify",
  },
  {
    id: "lofi-beats",
    title: "lofi beats",
    description: "Relaxed beats for reading, writing and coding.",
    uri: "spotify:playlist:37i9dQZF1DWWQRwui0ExPn",
    tag: "Spotify",
  },
  {
    id: "peaceful-piano",
    title: "Peaceful Piano",
    description: "Soft piano for quiet work blocks.",
    uri: "spotify:playlist:37i9dQZF1DX4sWSpwq3LiO",
    tag: "Spotify",
  },
  {
    id: "jazz-for-study",
    title: "Jazz for Study",
    description: "Low-friction jazz background for focus work.",
    uri: "spotify:playlist:37i9dQZF1DX3SiCzCxMDOH",
    tag: "Spotify",
  },
  {
    id: "brain-food",
    title: "Brain Food",
    description: "Electronic and ambient productivity music.",
    uri: "spotify:playlist:37i9dQZF1DWXLeA8Omikj7",
    tag: "Spotify",
  },
];

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const clampMinutes = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(value), 1), 180);
};

const getInitialDurationId = (settings: TimerSettings): string => {
  const storedDurationId = window.localStorage.getItem(ACTIVE_DURATION_STORAGE_KEY);

  if (storedDurationId) {
    return storedDurationId;
  }

  return (
    TIMER_PRESETS.find(
      (preset) =>
        preset.workMinutes === settings.workMinutes &&
        preset.breakMinutes === settings.breakMinutes,
    )?.id ?? "custom"
  );
};

const readTimerSettings = (): TimerSettings => {
  try {
    const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!rawSettings) {
      return DEFAULT_SETTINGS;
    }

    const parsedSettings = JSON.parse(rawSettings) as Partial<TimerSettings>;

    return {
      workMinutes: clampMinutes(
        parsedSettings.workMinutes ?? DEFAULT_SETTINGS.workMinutes,
        DEFAULT_SETTINGS.workMinutes,
      ),
      breakMinutes: clampMinutes(
        parsedSettings.breakMinutes ?? DEFAULT_SETTINGS.breakMinutes,
        DEFAULT_SETTINGS.breakMinutes,
      ),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const readDisplaySettings = (): FocusDisplaySettings => {
  try {
    const rawSettings = window.localStorage.getItem(DISPLAY_STORAGE_KEY);

    if (!rawSettings) {
      return DEFAULT_DISPLAY_SETTINGS;
    }

    return {
      ...DEFAULT_DISPLAY_SETTINGS,
      ...(JSON.parse(rawSettings) as Partial<FocusDisplaySettings>),
    };
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
};

const readCustomPlaylists = (): Playlist[] => {
  try {
    const rawPlaylists = window.localStorage.getItem(CUSTOM_PLAYLISTS_STORAGE_KEY);

    if (!rawPlaylists) {
      return [];
    }

    const parsedPlaylists = JSON.parse(rawPlaylists) as Playlist[];

    return parsedPlaylists.filter(
      (playlist) => playlist.id && playlist.title && playlist.uri.startsWith("spotify:playlist:"),
    );
  } catch {
    return [];
  }
};

const readArtworkCache = (): Record<string, PlaylistArtwork> => {
  try {
    const rawCache = window.localStorage.getItem(PLAYLIST_ARTWORK_CACHE_KEY);

    if (!rawCache) {
      return {};
    }

    return JSON.parse(rawCache) as Record<string, PlaylistArtwork>;
  } catch {
    return {};
  }
};

const writeArtworkCache = (cache: Record<string, PlaylistArtwork>): void => {
  window.localStorage.setItem(PLAYLIST_ARTWORK_CACHE_KEY, JSON.stringify(cache));
};

const readFreshArtworkCache = (): Record<string, PlaylistArtwork> => {
  const now = Date.now();
  const cache = readArtworkCache();
  const freshCache: Record<string, PlaylistArtwork> = {};

  Object.entries(cache).forEach(([uri, artwork]) => {
    if (artwork.expiresAt > now) {
      freshCache[uri] = artwork;
    }
  });

  return freshCache;
};

const updateArtworkCache = (uri: string, artwork: Omit<PlaylistArtwork, "expiresAt">): PlaylistArtwork => {
  const cache = readArtworkCache();
  const nextArtwork: PlaylistArtwork = {
    ...artwork,
    expiresAt: Date.now() + PLAYLIST_ARTWORK_CACHE_TTL_MS,
  };

  cache[uri] = nextArtwork;
  writeArtworkCache(cache);

  return nextArtwork;
};

const invalidateArtworkCache = (uri: string): void => {
  const cache = readArtworkCache();
  delete cache[uri];
  writeArtworkCache(cache);
};

const parsePlaylistUri = (input: string): string | null => {
  const trimmedInput = input.trim();

  if (/^spotify:playlist:[A-Za-z0-9]+$/.test(trimmedInput)) {
    return trimmedInput;
  }

  const urlMatch = trimmedInput.match(/open\.spotify\.com\/playlist\/([A-Za-z0-9]+)/);
  if (urlMatch) {
    return `spotify:playlist:${urlMatch[1]}`;
  }

  return null;
};

const getPlaylistId = (uri: string): string | null => {
  const uriMatch = uri.match(/^spotify:playlist:([A-Za-z0-9]+)$/);

  return uriMatch?.[1] ?? null;
};

const escapeCssValue = (value: string): string => {
  const cssApi = (window as unknown as { CSS?: { escape?: (input: string) => string } }).CSS;

  if (cssApi?.escape) {
    return cssApi.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
};

const normalizeText = (value: string | null | undefined): string => {
  return (value ?? "").replace(/\s+/g, " ").trim();
};

const getDurationForMode = (mode: TimerMode, settings: TimerSettings): number => {
  return (mode === "work" ? settings.workMinutes : settings.breakMinutes) * 60;
};

const formatTimerTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const formatClockTime = (date: Date): string => {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const isSpotifyImageUrl = (url: string): boolean => {
  return /i\.scdn\.co|i2o\.scdn\.co|image-cdn.*spotify|misc\.scdn\.co|mosaic\.scdn/.test(url);
};

const toSpotifyImageUrl = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  if (isSpotifyImageUrl(value)) {
    return value;
  }

  const spotifyImageMatch = value.match(/^spotify:image:([A-Za-z0-9]+)$/);
  if (spotifyImageMatch) {
    return `https://i.scdn.co/image/${spotifyImageMatch[1]}`;
  }

  return null;
};

const extractFirstSpotifyImageUrl = (value: unknown, depth = 0): string | null => {
  if (depth > 5) {
    return null;
  }

  const directUrl = toSpotifyImageUrl(value);
  if (directUrl) {
    return directUrl;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const imageUrl = extractFirstSpotifyImageUrl(item, depth + 1);
      if (imageUrl) {
        return imageUrl;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const preferredKeys = [
    "url",
    "uri",
    "imageUrl",
    "image_url",
    "coverUrl",
    "cover",
    "images",
    "image",
    "picture",
    "coverArt",
    "sources",
  ];

  for (const key of preferredKeys) {
    if (key in value) {
      const imageUrl = extractFirstSpotifyImageUrl(value[key], depth + 1);
      if (imageUrl) {
        return imageUrl;
      }
    }
  }

  for (const childValue of Object.values(value)) {
    const imageUrl = extractFirstSpotifyImageUrl(childValue, depth + 1);
    if (imageUrl) {
      return imageUrl;
    }
  }

  return null;
};

const getNestedString = (value: unknown, paths: string[][]): string | undefined => {
  for (const path of paths) {
    let currentValue: unknown = value;

    for (const key of path) {
      if (!isRecord(currentValue)) {
        currentValue = undefined;
        break;
      }

      currentValue = currentValue[key];
    }

    if (typeof currentValue === "string" && currentValue.trim()) {
      return currentValue.trim();
    }
  }

  return undefined;
};

const getSpicetifyExtended = (): SpicetifyExtended => {
  return Spicetify as unknown as SpicetifyExtended;
};

const fetchPlaylistArtworkFromInternalApis = async (
  playlistUri: string,
): Promise<Omit<PlaylistArtwork, "expiresAt"> | null> => {
  const spicetifyExtended = getSpicetifyExtended();
  const playlistApi = spicetifyExtended.Platform?.PlaylistAPI;
  const cosmosAsync = spicetifyExtended.CosmosAsync;

  try {
    if (playlistApi?.getMetadata) {
      const metadata = await playlistApi.getMetadata(playlistUri);
      const title = getNestedString(metadata, [["name"], ["title"]]);
      const description = getNestedString(metadata, [["description"]]);
      const owner = getNestedString(metadata, [
        ["owner", "name"],
        ["owner", "display_name"],
        ["ownerName"],
      ]);
      const imageUrl = extractFirstSpotifyImageUrl(metadata);

      if (title || imageUrl) {
        return {
          title,
          description,
          owner,
          imageUrl: imageUrl ?? undefined,
        };
      }
    }
  } catch (error) {
    console.warn("[Study Banger] PlaylistAPI metadata lookup failed:", error);
  }

  try {
    if (cosmosAsync?.get) {
      const response = await cosmosAsync.get<unknown>(`sp://core-playlist/v1/playlist/${playlistUri}`);
      const playlist = isRecord(response) && isRecord(response.playlist) ? response.playlist : response;
      const title = getNestedString(playlist, [["name"], ["title"]]);
      const description = getNestedString(playlist, [["description"]]);
      const owner = getNestedString(playlist, [
        ["owner", "name"],
        ["owner", "display_name"],
        ["ownerName"],
      ]);
      const imageUrl = extractFirstSpotifyImageUrl(playlist);

      if (title || imageUrl) {
        return {
          title,
          description,
          owner,
          imageUrl: imageUrl ?? undefined,
        };
      }
    }
  } catch (error) {
    console.warn("[Study Banger] Core playlist metadata lookup failed:", error);
  }

  return null;
};

const isVisibleElement = (element: Element): boolean => {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 8 &&
    rect.height > 8 &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.bottom >= 0 &&
    rect.right >= 0 &&
    rect.top <= window.innerHeight &&
    rect.left <= window.innerWidth
  );
};

const getPlaylistAnchorsInSpotifyDom = (playlistUri: string): HTMLAnchorElement[] => {
  const playlistId = getPlaylistId(playlistUri);

  if (!playlistId) {
    return [];
  }

  const escapedPlaylistId = escapeCssValue(playlistId);

  const selector = [
    `a[href*="/playlist/${escapedPlaylistId}"]`,
    `a[href*="spotify:playlist:${escapedPlaylistId}"]`,
    `a[href*="playlist/${escapedPlaylistId}"]`,
  ].join(",");

  return [...document.querySelectorAll<HTMLAnchorElement>(selector)].filter(isVisibleElement);
};

const findPlaylistDetailsInSpotifyDom = (playlistUri: string): DomPlaylistDetails => {
  const anchors = getPlaylistAnchorsInSpotifyDom(playlistUri);

  if (anchors.length === 0) {
    return {};
  }

  const title =
    anchors
      .map((anchor) => normalizeText(anchor.getAttribute("aria-label")))
      .find(Boolean) ||
    anchors
      .map((anchor) => normalizeText(anchor.getAttribute("title")))
      .find(Boolean) ||
    anchors.map((anchor) => normalizeText(anchor.textContent)).find(Boolean) ||
    undefined;

  const insideAnchorImages = anchors
    .flatMap((anchor) => [...anchor.querySelectorAll<HTMLImageElement>("img[src]")])
    .filter(isVisibleElement)
    .map((image) => image.currentSrc || image.src)
    .filter(isSpotifyImageUrl);

  return {
    title,
    coverUrl: insideAnchorImages[0],
  };
};

const getPlaylistInitials = (playlist: Playlist): string => {
  const words = playlist.title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) {
    return "PL";
  }

  return words.map((word) => word[0]).join("").toUpperCase();
};

const capturePlaybackSnapshot = (): PlaybackSnapshot | null => {
  try {
    const data = Spicetify.Player.data as
      | {
        context?: {
          uri?: string;
        };
        context_uri?: string;
        item?: {
          uri?: string;
        };
        isPaused?: boolean;
      }
      | undefined;

    const contextUri = data?.context?.uri || data?.context_uri || undefined;
    const trackUri = data?.item?.uri || undefined;
    const wasPaused = data?.isPaused ?? true;
    const shouldRestore = Boolean((contextUri || trackUri) && !wasPaused);

    return {
      contextUri,
      trackUri,
      wasPaused,
      shouldRestore,
    };
  } catch {
    return null;
  }
};

const readCurrentTrack = (): CurrentTrack | null => {
  try {
    const item = Spicetify.Player.data?.item as
      | {
        name?: string;
        artists?: Array<{
          name?: string;
        }>;
      }
      | undefined;

    if (!item?.name) {
      return null;
    }

    const artist = item.artists
      ?.map((entry) => entry.name)
      .filter((name): name is string => Boolean(name))
      .join(", ");

    return {
      title: item.name,
      artist: artist || "",
    };
  } catch {
    return null;
  }
};

const getFocusPlayerControls = (): FocusPlayerControls => {
  return Spicetify.Player as unknown as FocusPlayerControls;
};

const togglePlayerPlayback = (): void => {
  const player = getFocusPlayerControls();

  if (player.togglePlay) {
    void player.togglePlay();
    return;
  }

  if (player.data?.isPaused && player.resume) {
    void player.resume();
    return;
  }

  if (!player.data?.isPaused && player.pause) {
    void player.pause();
  }
};

const skipToPreviousTrack = (): void => {
  const player = getFocusPlayerControls();

  if (player.back) {
    void player.back();
  }
};

const skipToNextTrack = (): void => {
  const player = getFocusPlayerControls();

  if (player.next) {
    void player.next();
  }
};

const readPlayerVolume = (): number => {
  const player = getFocusPlayerControls();

  try {
    const rawVolume = player.getVolume?.();

    if (typeof rawVolume === "number" && Number.isFinite(rawVolume)) {
      return Math.round(Math.max(0, Math.min(rawVolume, 1)) * 100);
    }
  } catch {
    return 100;
  }

  return 100;
};

const setPlayerVolume = (volumePercent: number): void => {
  const player = getFocusPlayerControls();
  const normalizedVolume = Math.max(0, Math.min(volumePercent, 100)) / 100;

  if (player.setVolume) {
    void player.setVolume(normalizedVolume);
  }
};


const PreviousIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 4.75A.75.75 0 0 0 4.5 4v16A.75.75 0 0 0 6 20.75v-7.39l11.1 6.41A.9.9 0 0 0 18.45 19V5a.9.9 0 0 0-1.35-.77L6 10.64V4.75Z" />
  </svg>
);

const PlayIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606Z" />
  </svg>
);

const PauseIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5.7 3a.7.7 0 0 0-.7.7v16.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7H5.7Zm10 0a.7.7 0 0 0-.7.7v16.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7h-2.6Z" />
  </svg>
);

const NextIcon = (): JSX.Element => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 4.75A.75.75 0 0 1 19.5 4v16a.75.75 0 0 1-1.5 0v-7.39L6.9 19.77A.9.9 0 0 1 5.55 19V5a.9.9 0 0 1 1.35-.77L18 10.64V4.75Z" />
  </svg>
);

const VolumeIcon = (): JSX.Element => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M10.016 1.125A.75.75 0 0 0 8.99.85l-6.925 4a3.64 3.64 0 0 0 0 6.299l6.925 4a.75.75 0 0 0 1.125-.65v-13a.75.75 0 0 0-.1-.375ZM11.5 5.56a2.75 2.75 0 0 1 0 4.88V5.56ZM16 8a5.75 5.75 0 0 1-4.5 5.614v-1.55a4.252 4.252 0 0 0 0-8.127v-1.55A5.75 5.75 0 0 1 16 8Z" />
  </svg>
);


const StudyTimePage: React.FC<Props> = ({ onEndStudy }) => {
  const initialSettings = readTimerSettings();

  const [settings, setSettings] = useState<TimerSettings>(() => initialSettings);
  const [activeDurationId, setActiveDurationId] = useState<string>(() =>
    getInitialDurationId(initialSettings),
  );
  const [displaySettings, setDisplaySettings] = useState<FocusDisplaySettings>(() =>
    readDisplaySettings(),
  );
  const [mode, setMode] = useState<TimerMode>("work");
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [secondsLeft, setSecondsLeft] = useState(() => initialSettings.workMinutes * 60);
  const [isPaused, setIsPaused] = useState(true);
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(() => readCustomPlaylists());
  const [playlistName, setPlaylistName] = useState("");
  const [playlistLink, setPlaylistLink] = useState("");
  const [selectedPlaylistUri, setSelectedPlaylistUri] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(() => readCurrentTrack());
  const [playerIsPaused, setPlayerIsPaused] = useState(() => Boolean(getFocusPlayerControls().data?.isPaused ?? true));
  const [now, setNow] = useState(() => new Date());
  const [volumePercent, setVolumePercent] = useState(() => readPlayerVolume());
  const [artworkByUri, setArtworkByUri] = useState<Record<string, PlaylistArtwork>>(() =>
    readFreshArtworkCache(),
  );
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, boolean>>({});
  const [failedCoverUris, setFailedCoverUris] = useState<Record<string, boolean>>({});

  const initialPlaybackRef = useRef<PlaybackSnapshot | null>(null);
  const focusOverlayRootRef = useRef<HTMLDivElement | null>(null);
  const artworkFetchQueueRef = useRef(new Set<string>());

  const allPlaylists = useMemo(() => [...DEFAULT_PLAYLISTS, ...customPlaylists], [customPlaylists]);

  const playlistUriSignature = useMemo(
    () => allPlaylists.map((playlist) => playlist.uri).join("|"),
    [allPlaylists],
  );

  const refreshOnePlaylistArtwork = async (
    playlistUri: string,
    options: { force?: boolean } = {},
  ): Promise<PlaylistArtwork | null> => {
    const cachedArtwork = readFreshArtworkCache()[playlistUri];

    if (!options.force && cachedArtwork) {
      setArtworkByUri((previousArtwork) => ({
        ...previousArtwork,
        [playlistUri]: cachedArtwork,
      }));

      return cachedArtwork;
    }

    if (artworkFetchQueueRef.current.has(playlistUri)) {
      return null;
    }

    artworkFetchQueueRef.current.add(playlistUri);

    try {
      const internalArtwork = await fetchPlaylistArtworkFromInternalApis(playlistUri);
      const domDetails = findPlaylistDetailsInSpotifyDom(playlistUri);

      const mergedArtwork = internalArtwork || domDetails.coverUrl || domDetails.title
        ? updateArtworkCache(playlistUri, {
          title: internalArtwork?.title || domDetails.title,
          description: internalArtwork?.description,
          owner: internalArtwork?.owner,
          imageUrl: internalArtwork?.imageUrl || domDetails.coverUrl,
        })
        : null;

      if (mergedArtwork) {
        setArtworkByUri((previousArtwork) => ({
          ...previousArtwork,
          [playlistUri]: mergedArtwork,
        }));

        setFailedCoverUris((previousFailures) => {
          const nextFailures = { ...previousFailures };
          delete nextFailures[playlistUri];
          return nextFailures;
        });
      }

      return mergedArtwork;
    } finally {
      artworkFetchQueueRef.current.delete(playlistUri);
    }
  };

  const refreshPlaylistArtwork = async (showNotification = true): Promise<void> => {
    let foundCount = 0;

    for (const playlist of allPlaylists) {
      const artwork = await refreshOnePlaylistArtwork(playlist.uri, { force: true });

      if (artwork?.imageUrl) {
        foundCount += 1;
      }

      await sleep(600);
    }

    if (showNotification) {
      Spicetify.showNotification(
        foundCount > 0
          ? `Updated ${foundCount} playlist cover${foundCount === 1 ? "" : "s"}.`
          : "No playlist covers could be updated.",
      );
    }
  };

  const recoverCoverAfterImageError = async (playlist: Playlist, failedUrl: string): Promise<void> => {
    setFailedImageUrls((previousFailures) => ({
      ...previousFailures,
      [failedUrl]: true,
    }));

    invalidateArtworkCache(playlist.uri);

    const artwork = await refreshOnePlaylistArtwork(playlist.uri, { force: true });
    const replacementUrl = artwork?.imageUrl;

    if (replacementUrl && replacementUrl !== failedUrl) {
      setFailedCoverUris((previousFailures) => {
        const nextFailures = { ...previousFailures };
        delete nextFailures[playlist.uri];
        return nextFailures;
      });
      return;
    }

    setFailedCoverUris((previousFailures) => ({
      ...previousFailures,
      [playlist.uri]: true,
    }));
  };

  useEffect(() => {
    initialPlaybackRef.current = capturePlaybackSnapshot();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_DURATION_STORAGE_KEY, activeDurationId);
  }, [activeDurationId]);

  useEffect(() => {
    window.localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(displaySettings));
  }, [displaySettings]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_PLAYLISTS_STORAGE_KEY, JSON.stringify(customPlaylists));
  }, [customPlaylists]);

  useEffect(() => {
    const playerEvents = Spicetify.Player as unknown as PlayerEventTarget;
    const updateTrack = (): void => {
      setCurrentTrack(readCurrentTrack());
      setPlayerIsPaused(Boolean(getFocusPlayerControls().data?.isPaused ?? true));
      setVolumePercent(readPlayerVolume());
    };

    updateTrack();

    playerEvents.addEventListener?.("songchange", updateTrack);
    playerEvents.addEventListener?.("onplaypause", updateTrack);

    return () => {
      playerEvents.removeEventListener?.("songchange", updateTrack);
      playerEvents.removeEventListener?.("onplaypause", updateTrack);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (viewMode !== "focus") {
      return undefined;
    }

    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setViewMode("dashboard");
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => window.removeEventListener("keydown", handleKeydown);
  }, [viewMode]);

  useEffect(() => {
    const focusBodyClass = "study-banger-focus-active";

    if (viewMode !== "focus") {
      document.body.classList.remove(focusBodyClass);
      return undefined;
    }

    document.body.classList.add(focusBodyClass);

    return () => {
      document.body.classList.remove(focusBodyClass);
    };
  }, [viewMode]);

  useEffect(() => {
    let cancelled = false;

    const hydrateMissingArtwork = async (): Promise<void> => {
      for (const playlist of allPlaylists) {
        if (cancelled) {
          return;
        }

        const hasDefaultCover = Boolean(playlist.coverUrl);
        const hasFreshCachedCover = Boolean(readFreshArtworkCache()[playlist.uri]?.imageUrl);

        if (hasDefaultCover || hasFreshCachedCover) {
          continue;
        }

        await refreshOnePlaylistArtwork(playlist.uri);
        await sleep(600);
      }
    };

    void hydrateMissingArtwork();

    return () => {
      cancelled = true;
    };
  }, [playlistUriSignature]);

  useEffect(() => {
    if (isPaused) {
      return undefined;
    }

    const interval = setInterval(() => {
      setSecondsLeft((previousSecondsLeft) => {
        if (previousSecondsLeft > 1) {
          return previousSecondsLeft - 1;
        }

        const nextMode: TimerMode = mode === "work" ? "break" : "work";
        const nextDuration = getDurationForMode(nextMode, settings);

        setMode(nextMode);
        setIsPaused(true);

        Spicetify.showNotification(
          mode === "work" ? "Work block finished. Break time." : "Break finished. Back to focus.",
        );

        return nextDuration;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, mode, settings]);

  const totalSeconds = getDurationForMode(mode, settings);
  const progressPercent = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100);

  const updateSettings = (nextSettings: TimerSettings): void => {
    const normalizedSettings = {
      workMinutes: clampMinutes(nextSettings.workMinutes, DEFAULT_SETTINGS.workMinutes),
      breakMinutes: clampMinutes(nextSettings.breakMinutes, DEFAULT_SETTINGS.breakMinutes),
    };

    setSettings(normalizedSettings);
    setActiveDurationId("custom");

    if (isPaused) {
      setSecondsLeft(getDurationForMode(mode, normalizedSettings));
    }
  };

  const applyPreset = (preset: TimerPreset): void => {
    const nextSettings = {
      workMinutes: preset.workMinutes,
      breakMinutes: preset.breakMinutes,
    };

    setActiveDurationId(preset.id);
    setSettings(nextSettings);
    setIsPaused(true);
    setSecondsLeft(getDurationForMode(mode, nextSettings));
  };

  const selectCustomDuration = (): void => {
    setActiveDurationId("custom");
    setIsPaused(true);
    setSecondsLeft(getDurationForMode(mode, settings));
  };

  const resetTimer = (): void => {
    setIsPaused(true);
    setSecondsLeft(getDurationForMode(mode, settings));
  };

  const switchMode = (): void => {
    const nextMode: TimerMode = mode === "work" ? "break" : "work";

    setMode(nextMode);
    setIsPaused(true);
    setSecondsLeft(getDurationForMode(nextMode, settings));
  };

  const playPlaylist = async (playlist: Playlist): Promise<void> => {
    try {
      await Spicetify.Player.playUri(playlist.uri);
      setSelectedPlaylistUri(playlist.uri);
      Spicetify.showNotification(`Playing ${playlist.title}`);
      setCurrentTrack(readCurrentTrack());
    } catch (error) {
      console.error("Could not play playlist:", error);
      Spicetify.showNotification("Could not start playlist.");
    }
  };

  const restorePreviousPlayback = async (): Promise<void> => {
    const snapshot = initialPlaybackRef.current;
    const uriToRestore = snapshot?.contextUri || snapshot?.trackUri;

    if (!snapshot?.shouldRestore || !uriToRestore) {
      Spicetify.showNotification("No active previous playback to restore.");
      return;
    }

    try {
      await Spicetify.Player.playUri(uriToRestore);
      Spicetify.showNotification("Previous playback restored.");
    } catch (error) {
      console.error("Could not restore previous playback:", error);
      Spicetify.showNotification("Could not restore previous playback.");
    }
  };

  const endStudySession = (): void => {
    setIsPaused(true);
    onEndStudy();
  };

  const endStudySessionAndRestore = (): void => {
    setIsPaused(true);

    void restorePreviousPlayback().finally(() => {
      onEndStudy();
    });
  };

  const addCustomPlaylist = async (): Promise<void> => {
    const parsedUri = parsePlaylistUri(playlistLink);

    if (!parsedUri) {
      Spicetify.showNotification("Paste a valid Spotify playlist link.");
      return;
    }

    const artwork = await refreshOnePlaylistArtwork(parsedUri, { force: true });
    const domDetails = findPlaylistDetailsInSpotifyDom(parsedUri);
    const title = playlistName.trim() || artwork?.title || domDetails.title || "Custom playlist";

    const playlist: Playlist = {
      id: `custom-${Date.now()}`,
      title,
      description: artwork?.description || "Your custom Spotify playlist.",
      uri: parsedUri,
      tag: artwork?.owner || "Custom",
      coverUrl: artwork?.imageUrl || domDetails.coverUrl || undefined,
    };

    setCustomPlaylists((previousPlaylists) => [...previousPlaylists, playlist]);
    setPlaylistName("");
    setPlaylistLink("");
  };

  const removeCustomPlaylist = (playlistId: string): void => {
    setCustomPlaylists((previousPlaylists) =>
      previousPlaylists.filter((playlist) => playlist.id !== playlistId),
    );
  };

  const toggleDisplaySetting = (key: keyof FocusDisplaySettings): void => {
    setDisplaySettings((previousSettings) => ({
      ...previousSettings,
      [key]: !previousSettings[key],
    }));
  };

  const dashboard = (
    <section className={styles.studyLayout}>
      <header className={styles.studyTopbar}>
        <div>
          <p className={styles.eyebrow}>Study Banger</p>
          <h1 className={styles.studyTitle}>{mode === "work" ? "Focus session" : "Break session"}</h1>
        </div>

        <div className={styles.topbarActions}>
          <button className={styles.secondaryButton} onClick={() => setViewMode("focus")}>
            Focus view
          </button>
          <button className={styles.secondaryButton} onClick={endStudySession}>
            End session
          </button>
          <button className={styles.secondaryButton} onClick={endStudySessionAndRestore}>
            End & restore
          </button>
        </div>
      </header>

      <div className={styles.dashboardGrid}>
        <section className={`${styles.glassPanel} ${styles.timerPanel}`}>
          <div
            className={styles.progressRing}
            style={{
              background: `conic-gradient(var(--sb-accent) ${progressPercent}%, rgba(255,255,255,0.10) ${progressPercent}%)`,
            }}
          >
            <div className={styles.progressInner}>
              <span>{mode === "work" ? "Work" : "Break"}</span>
              <strong>{formatTimerTime(secondsLeft)}</strong>
            </div>
          </div>

          <div className={styles.timerActions}>
            <button
              className={styles.primaryButton}
              onClick={() => setIsPaused((previousValue) => !previousValue)}
            >
              {isPaused ? "Start" : "Pause"}
            </button>
            <button className={styles.secondaryButton} onClick={resetTimer}>
              Reset
            </button>
            <button className={styles.secondaryButton} onClick={switchMode}>
              Switch to {mode === "work" ? "break" : "focus"}
            </button>
          </div>

          <p className={styles.helperText}>
            When a block ends, the app switches to the next mode and pauses.
          </p>
        </section>

        <section className={styles.glassPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Timer</p>
              <h2>Durations</h2>
            </div>
          </div>

          <div className={styles.durationList}>
            {TIMER_PRESETS.map((preset) => (
              <label
                key={preset.id}
                className={`${styles.durationOption} ${activeDurationId === preset.id ? styles.durationOptionActive : ""
                  }`}
              >
                <input
                  type="radio"
                  name="timer-preset"
                  checked={activeDurationId === preset.id}
                  onChange={() => applyPreset(preset)}
                />
                <span className={styles.radioDot} />
                <span>
                  <strong>{preset.label}</strong>
                  <small>{preset.description}</small>
                </span>
              </label>
            ))}

            <label
              className={`${styles.durationOption} ${activeDurationId === "custom" ? styles.durationOptionActive : ""
                }`}
            >
              <input
                type="radio"
                name="timer-preset"
                checked={activeDurationId === "custom"}
                onChange={selectCustomDuration}
              />
              <span className={styles.radioDot} />
              <span className={styles.customDurationBlock}>
                <strong>Custom</strong>
                <div className={styles.durationInputs}>
                  <label>
                    <small>Focus</small>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={settings.workMinutes}
                      onFocus={selectCustomDuration}
                      onChange={(event) =>
                        updateSettings({
                          ...settings,
                          workMinutes: Number(event.currentTarget.value),
                        })
                      }
                    />
                  </label>

                  <label>
                    <small>Break</small>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={settings.breakMinutes}
                      onFocus={selectCustomDuration}
                      onChange={(event) =>
                        updateSettings({
                          ...settings,
                          breakMinutes: Number(event.currentTarget.value),
                        })
                      }
                    />
                  </label>
                </div>
              </span>
            </label>
          </div>

          <div className={styles.focusSettings}>
            <p className={styles.eyebrow}>Focus view display</p>

            <label>
              <input
                type="checkbox"
                checked={displaySettings.showSong}
                onChange={() => toggleDisplaySetting("showSong")}
              />
              Show current song
            </label>

            <label>
              <input
                type="checkbox"
                checked={displaySettings.showClock}
                onChange={() => toggleDisplaySetting("showClock")}
              />
              Show clock
            </label>

            <label>
              <input
                type="checkbox"
                checked={displaySettings.showDate}
                onChange={() => toggleDisplaySetting("showDate")}
              />
              Show date
            </label>

            <label>
              <input
                type="checkbox"
                checked={displaySettings.showControls}
                onChange={() => toggleDisplaySetting("showControls")}
              />
              Show timer controls
            </label>

            <label>
              <input
                type="checkbox"
                checked={displaySettings.showMusicControls}
                onChange={() => toggleDisplaySetting("showMusicControls")}
              />
              Show music controls
            </label>
          </div>
        </section>
      </div>

      <section className={styles.glassPanel}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>Music</p>
            <h2>Playlists</h2>
          </div>

          <button
            className={styles.secondaryButton}
            onClick={() => {
              void refreshPlaylistArtwork(true);
            }}
          >
            Refresh covers
          </button>
        </div>

        <div className={styles.playlistForm}>
          <input
            placeholder="Playlist name, optional"
            value={playlistName}
            onChange={(event) => setPlaylistName(event.currentTarget.value)}
          />
          <input
            placeholder="Spotify playlist link or spotify:playlist:..."
            value={playlistLink}
            onChange={(event) => setPlaylistLink(event.currentTarget.value)}
          />
          <button
            className={styles.secondaryButton}
            onClick={() => {
              void addCustomPlaylist();
            }}
          >
            Add playlist
          </button>
        </div>

        <div className={styles.libraryGrid}>
          {allPlaylists.map((playlist, index) => {
            const artwork = artworkByUri[playlist.uri];
            const resolvedPlaylist: Playlist = {
              ...playlist,
              title: artwork?.title || playlist.title,
              description: artwork?.description || playlist.description,
              tag: artwork?.owner || playlist.tag,
              coverUrl: artwork?.imageUrl || playlist.coverUrl,
            };

            const isSelected = selectedPlaylistUri === playlist.uri;
            const isCustom = playlist.id.startsWith("custom-");
            const imageUrl = resolvedPlaylist.coverUrl;
            const hasUsableCover = Boolean(
              imageUrl && !failedImageUrls[imageUrl] && !failedCoverUris[playlist.uri],
            );

            return (
              <article
                key={playlist.id}
                className={`${styles.libraryCard} ${isSelected ? styles.libraryCardActive : ""}`}
              >
                <button
                  className={styles.coverButton}
                  onClick={() => {
                    void playPlaylist(resolvedPlaylist);
                  }}
                  aria-label={`Play ${resolvedPlaylist.title}`}
                >
                  {hasUsableCover && imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      onError={() => {
                        void recoverCoverAfterImageError(resolvedPlaylist, imageUrl);
                      }}
                    />
                  ) : (
                    <span className={`${styles.generatedCover} ${styles[`coverTone${index % 6}`]}`}>
                      {getPlaylistInitials(resolvedPlaylist)}
                    </span>
                  )}
                </button>

                <div className={styles.libraryMeta}>
                  <strong title={resolvedPlaylist.title}>{resolvedPlaylist.title}</strong>
                  <span title={resolvedPlaylist.tag}>{resolvedPlaylist.tag}</span>
                </div>

                {isCustom && (
                  <button
                    className={styles.removeButton}
                    onClick={() => removeCustomPlaylist(playlist.id)}
                  >
                    Remove
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );

  const focusView = (
    <section className={styles.fullFocusView}>
      <div className={styles.fullFocusTopbar}>
        <button className={styles.focusDashboardLink} onClick={() => setViewMode("dashboard")}>
          Dashboard
        </button>
      </div>

      <div className={styles.fullFocusCenter}>

        <div className={styles.fullFocusTime}>{formatTimerTime(secondsLeft)}</div>

        {displaySettings.showControls && (
          <div className={styles.fullFocusControls}>
            <button
              className={styles.primaryButton}
              onClick={() => setIsPaused((previousValue) => !previousValue)}
            >
              {isPaused ? "Start" : "Pause"}
            </button>
            <button className={styles.secondaryButton} onClick={resetTimer}>
              Reset
            </button>
            <button className={styles.secondaryButton} onClick={switchMode}>
              {mode === "work" ? "Break" : "Focus"}
            </button>
          </div>
        )}

        {displaySettings.showMusicControls && (
          <div className={styles.fullFocusPlayerControls} aria-label="Spotify playback controls">
            <button className={styles.focusIconButton} onClick={skipToPreviousTrack} aria-label="Previous track">
              <PreviousIcon />
            </button>
            <button
              className={`${styles.focusIconButton} ${styles.focusPlayButton}`}
              onClick={() => {
                togglePlayerPlayback();
                window.setTimeout(() => {
                  setPlayerIsPaused(Boolean(getFocusPlayerControls().data?.isPaused ?? true));
                  setCurrentTrack(readCurrentTrack());
                }, 120);
              }}
              aria-label={playerIsPaused ? "Play" : "Pause"}
            >
              {playerIsPaused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <button className={styles.focusIconButton} onClick={skipToNextTrack} aria-label="Next track">
              <NextIcon />
            </button>
            <label className={styles.focusVolumeControl} aria-label="Volume">
              <VolumeIcon />
              <input
                type="range"
                min="0"
                max="100"
                value={volumePercent}
                onChange={(event) => {
                  const nextVolume = Number(event.currentTarget.value);
                  setVolumePercent(nextVolume);
                  setPlayerVolume(nextVolume);
                }}
              />
            </label>
          </div>
        )}

        {displaySettings.showSong && (
          <p className={styles.fullFocusSong}>
            {currentTrack ? (
              <>
                {currentTrack.title}
                {currentTrack.artist ? <span> · {currentTrack.artist}</span> : null}
              </>
            ) : (
              "No song playing"
            )}
          </p>
        )}

        {(displaySettings.showClock || displaySettings.showDate) && (
          <div className={styles.fullFocusDateTime}>
            {displaySettings.showClock && <span>{formatClockTime(now)}</span>}
            {displaySettings.showDate && (
              <span>
                {now.toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );

  useEffect(() => {
    const reactDom = (Spicetify as unknown as { ReactDOM?: SpicetifyReactDomLike }).ReactDOM;

    if (viewMode !== "focus") {
      if (focusOverlayRootRef.current) {
        reactDom?.unmountComponentAtNode?.(focusOverlayRootRef.current);
        focusOverlayRootRef.current.remove();
        focusOverlayRootRef.current = null;
      }

      return;
    }

    if (!reactDom?.render) {
      return;
    }

    if (!focusOverlayRootRef.current) {
      const root = document.createElement("div");
      root.id = "study-banger-focus-root";
      document.body.appendChild(root);
      focusOverlayRootRef.current = root;
    }

    reactDom.render(focusView, focusOverlayRootRef.current);
  });

  useEffect(() => {
    return () => {
      const reactDom = (Spicetify as unknown as { ReactDOM?: SpicetifyReactDomLike }).ReactDOM;

      if (focusOverlayRootRef.current) {
        reactDom?.unmountComponentAtNode?.(focusOverlayRootRef.current);
        focusOverlayRootRef.current.remove();
        focusOverlayRootRef.current = null;
      }
    };
  }, []);

  return viewMode === "dashboard" ? dashboard : null;
};

export default StudyTimePage;
