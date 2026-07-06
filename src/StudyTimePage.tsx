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
}

interface Playlist {
  id: string;
  title: string;
  description: string;
  uri: string;
  tag: string;
  coverUrl?: string;
}

interface PlaylistMetadata {
  title?: string;
  description?: string;
  coverUrl?: string;
  owner?: string;
}

interface PlaylistApiResponse {
  name?: string;
  description?: string;
  images?: Array<{ url?: string }>;
  owner?: {
    display_name?: string;
  };
}

interface CurrentTrack {
  title: string;
  artist: string;
}

interface PlaybackSnapshot {
  contextUri?: string;
  trackUri?: string;
  wasPaused: boolean;
}

const SETTINGS_STORAGE_KEY = "study-banger:timer-settings";
const ACTIVE_DURATION_STORAGE_KEY = "study-banger:active-duration-id";
const DISPLAY_STORAGE_KEY = "study-banger:focus-display-settings";
const CUSTOM_PLAYLISTS_STORAGE_KEY = "study-banger:custom-playlists";
const PLAYLIST_METADATA_CACHE_KEY = "study-banger:playlist-metadata-cache";

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
  showMode: true,
  showSong: true,
  showClock: false,
  showDate: false,
  showControls: true,
};

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: "classical-study-or-sleep",
    title: "Classical music to study or sleep",
    description: "Original Study Banger playlist.",
    uri: "spotify:playlist:5cwPclg5ZtafoBPWgZMHMb",
    tag: "Original",
  },
  {
    id: "classical-bangers",
    title: "classical bangers",
    description: "Original Study Banger playlist.",
    uri: "spotify:playlist:27Zm1P410dPfedsdoO9fqm",
    tag: "Original",
  },
  {
    id: "lofi-study-2024",
    title: "Lofi study 2024",
    description: "Original Study Banger playlist.",
    uri: "spotify:playlist:6zCID88oNjNv9zx6puDHKj",
    tag: "Original",
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

const clampMinutes = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(value), 1), 180);
};

const readMetadataCache = (): Record<string, PlaylistMetadata> => {
  try {
    const rawCache = window.localStorage.getItem(PLAYLIST_METADATA_CACHE_KEY);

    if (!rawCache) {
      return {};
    }

    return JSON.parse(rawCache) as Record<string, PlaylistMetadata>;
  } catch {
    return {};
  }
};

const writeMetadataCache = (cache: Record<string, PlaylistMetadata>): void => {
  window.localStorage.setItem(PLAYLIST_METADATA_CACHE_KEY, JSON.stringify(cache));
};

const getInitialDurationId = (settings: TimerSettings): string => {
  const storedDurationId = window.localStorage.getItem(ACTIVE_DURATION_STORAGE_KEY);

  if (storedDurationId) {
    return storedDurationId;
  }

  return (
    TIMER_PRESETS.find(
      (preset) =>
        preset.workMinutes === settings.workMinutes && preset.breakMinutes === settings.breakMinutes,
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
    const data = Spicetify.Player.data;

    return {
      contextUri: data?.context?.uri || undefined,
      trackUri: data?.item?.uri || undefined,
      wasPaused: data?.isPaused ?? true,
    };
  } catch {
    return null;
  }
};

const readCurrentTrack = (): CurrentTrack | null => {
  try {
    const item = Spicetify.Player.data?.item;

    if (!item?.name) {
      return null;
    }

    return {
      title: item.name,
      artist: item.artists?.map((artist) => artist.name).join(", ") || "",
    };
  } catch {
    return null;
  }
};

const fetchPlaylistMetadata = async (uri: string): Promise<PlaylistMetadata | null> => {
  const playlistId = getPlaylistId(uri);

  if (!playlistId) {
    return null;
  }

  const cosmos = (Spicetify as unknown as {
    CosmosAsync?: {
      get: <T>(url: string) => Promise<T>;
    };
  }).CosmosAsync;

  if (!cosmos?.get) {
    return null;
  }

  try {
    const response = await cosmos.get<PlaylistApiResponse>(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,images,owner(display_name)`,
    );

    return {
      title: response.name,
      description: response.description,
      coverUrl: response.images?.find((image) => image.url)?.url,
      owner: response.owner?.display_name,
    };
  } catch (error) {
    console.warn("Could not fetch playlist metadata:", error);
    return null;
  }
};

const StudyTimePage: React.FC<Props> = ({ onEndStudy }) => {
  const initialSettings = readTimerSettings();
  const [settings, setSettings] = useState<TimerSettings>(() => initialSettings);
  const [activeDurationId, setActiveDurationId] = useState<string>(() => getInitialDurationId(initialSettings));
  const [displaySettings, setDisplaySettings] = useState<FocusDisplaySettings>(() => readDisplaySettings());
  const [mode, setMode] = useState<TimerMode>("work");
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [secondsLeft, setSecondsLeft] = useState(() => initialSettings.workMinutes * 60);
  const [isPaused, setIsPaused] = useState(true);
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(() => readCustomPlaylists());
  const [playlistName, setPlaylistName] = useState("");
  const [playlistLink, setPlaylistLink] = useState("");
  const [selectedPlaylistUri, setSelectedPlaylistUri] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(() => readCurrentTrack());
  const [now, setNow] = useState(() => new Date());
  const [metadataByUri, setMetadataByUri] = useState<Record<string, PlaylistMetadata>>(() => readMetadataCache());
  const [failedCoverUris, setFailedCoverUris] = useState<Record<string, boolean>>({});
  const metadataFetchQueueRef = useRef(new Set<string>());
  const initialPlaybackRef = useRef<PlaybackSnapshot | null>(null);

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
    const updateTrack = (): void => setCurrentTrack(readCurrentTrack());

    updateTrack();

    Spicetify.Player.addEventListener("songchange", updateTrack);
    Spicetify.Player.addEventListener("onplaypause", updateTrack);

    return () => {
      Spicetify.Player.removeEventListener("songchange", updateTrack);
      Spicetify.Player.removeEventListener("onplaypause", updateTrack);
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

  const allPlaylists = useMemo(() => [...DEFAULT_PLAYLISTS, ...customPlaylists], [customPlaylists]);
  const playlistUriSignature = useMemo(() => allPlaylists.map((playlist) => playlist.uri).join("|"), [allPlaylists]);

  useEffect(() => {
    let cancelled = false;

    const loadMissingMetadata = async (): Promise<void> => {
      for (const playlist of allPlaylists) {
        if (cancelled) {
          return;
        }

        const cachedMetadata = readMetadataCache()[playlist.uri];
        const alreadyHasCover = Boolean(playlist.coverUrl || cachedMetadata?.coverUrl);
        const alreadyQueued = metadataFetchQueueRef.current.has(playlist.uri);

        if (alreadyHasCover || alreadyQueued) {
          continue;
        }

        metadataFetchQueueRef.current.add(playlist.uri);
        const metadata = await fetchPlaylistMetadata(playlist.uri);

        if (cancelled) {
          return;
        }

        if (metadata) {
          setMetadataByUri((previousMetadata) => {
            const nextMetadata = {
              ...previousMetadata,
              [playlist.uri]: {
                ...previousMetadata[playlist.uri],
                ...metadata,
              },
            };

            writeMetadataCache(nextMetadata);
            return nextMetadata;
          });
        }

        await sleep(900);
      }
    };

    void loadMissingMetadata();

    return () => {
      cancelled = true;
    };
  }, [playlistUriSignature, allPlaylists]);

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

    if (!uriToRestore) {
      return;
    }

    try {
      await Spicetify.Player.playUri(uriToRestore);

      if (snapshot?.wasPaused) {
        window.setTimeout(() => Spicetify.Player.pause(), 250);
      }

      Spicetify.showNotification("Previous playback restored.");
    } catch (error) {
      console.error("Could not restore previous playback:", error);
      Spicetify.showNotification("Could not restore previous playback.");
    }
  };

  const endStudySession = (): void => {
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

    const metadata = await fetchPlaylistMetadata(parsedUri);
    const title = playlistName.trim() || metadata?.title || "Custom playlist";

    const playlist: Playlist = {
      id: `custom-${Date.now()}`,
      title,
      description: metadata?.description || "Your custom Spotify playlist.",
      uri: parsedUri,
      tag: metadata?.owner || "Custom",
      coverUrl: metadata?.coverUrl,
    };

    if (metadata) {
      setMetadataByUri((previousMetadata) => {
        const nextMetadata = {
          ...previousMetadata,
          [parsedUri]: metadata,
        };

        writeMetadataCache(nextMetadata);
        return nextMetadata;
      });
    }

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
            <button className={styles.primaryButton} onClick={() => setIsPaused((previousValue) => !previousValue)}>
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
                className={`${styles.durationOption} ${activeDurationId === preset.id ? styles.durationOptionActive : ""}`}
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

            <label className={`${styles.durationOption} ${activeDurationId === "custom" ? styles.durationOptionActive : ""}`}>
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
                checked={displaySettings.showMode}
                onChange={() => toggleDisplaySetting("showMode")}
              />
              Show mode label
            </label>

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
              Show controls
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
            const metadata = metadataByUri[playlist.uri];
            const resolvedPlaylist: Playlist = {
              ...playlist,
              title: metadata?.title || playlist.title,
              description: metadata?.description || playlist.description,
              coverUrl: metadata?.coverUrl || playlist.coverUrl,
              tag: metadata?.owner || playlist.tag,
            };

            const isSelected = selectedPlaylistUri === playlist.uri;
            const isCustom = playlist.id.startsWith("custom-");
            const hasUsableCover = Boolean(resolvedPlaylist.coverUrl && !failedCoverUris[playlist.uri]);

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
                  {hasUsableCover ? (
                    <img
                      src={resolvedPlaylist.coverUrl}
                      alt=""
                      onError={() =>
                        setFailedCoverUris((previousFailures) => ({
                          ...previousFailures,
                          [playlist.uri]: true,
                        }))
                      }
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
                  <button className={styles.removeButton} onClick={() => removeCustomPlaylist(playlist.id)}>
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

  const controlsHiddenClass = displaySettings.showControls ? "" : styles.fullFocusControlsHidden;

  const focusView = (
    <section className={`${styles.fullFocusView} ${controlsHiddenClass}`}>
      <div className={styles.fullFocusTopbar}>
        <button className={styles.secondaryButton} onClick={() => setViewMode("dashboard")}>
          Dashboard
        </button>
        <button className={styles.secondaryButton} onClick={endStudySession}>
          End & restore
        </button>
      </div>

      <div className={styles.fullFocusCenter}>
        {displaySettings.showMode && (
          <p className={styles.eyebrow}>{mode === "work" ? "Focus" : "Break"}</p>
        )}

        <div className={styles.fullFocusTime}>{formatTimerTime(secondsLeft)}</div>

        <div className={styles.fullFocusControls}>
          <button className={styles.primaryButton} onClick={() => setIsPaused((previousValue) => !previousValue)}>
            {isPaused ? "Start" : "Pause"}
          </button>
          <button className={styles.secondaryButton} onClick={resetTimer}>
            Reset
          </button>
          <button className={styles.secondaryButton} onClick={switchMode}>
            {mode === "work" ? "Break" : "Focus"}
          </button>
        </div>

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

  return viewMode === "dashboard" ? dashboard : focusView;
};

export default StudyTimePage;
