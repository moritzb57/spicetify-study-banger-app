import React, { useEffect, useState } from "react";
import styles from "./css/app.module.scss";

interface Props {
  onEndStudy: () => void;
  onChangeTheme: () => void;
}

interface Playlist {
  id: number;
  title: string;
  description: string;
  link: string;
  image: string;
}

const playlists: Playlist[] = [
  {
    id: 1,
    title: "Classical music to study or sleep",
    description: "The perfect study beats. Find your focus, crush your session.",
    link: "spotify:playlist:5cwPclg5ZtafoBPWgZMHMb",
    image: "https://i.scdn.co/image/ab67706c0000da84e74b9d9bf3efbd3f3bf83cf0",
  },
  {
    id: 2,
    title: "Classical Bangers",
    description: "Energetic classical pieces for productive focus work.",
    link: "spotify:playlist:27Zm1P410dPfedsdoO9fqm",
    image: "https://i.scdn.co/image/ab67706c0000da84d3bb9e70d9824ad03a8ec81f",
  },
  {
    id: 3,
    title: "Lofi Study",
    description: "Calm beats for reading, writing, coding and deep work.",
    link: "spotify:playlist:6zCID88oNjNv9zx6puDHKj",
    image: "https://i.scdn.co/image/ab67706c0000da84e8fcb214bcd7d054018d9fe4",
  },
];

const StudyTimePage: React.FC<Props> = ({ onEndStudy, onChangeTheme }) => {
  const [timer, setTimer] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(true);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (!isPaused) {
      interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setIsRunning((prevIsRunning) => {
              setTimer(prevIsRunning ? 5 * 60 : 25 * 60);
              setIsPaused(true);

              if (interval) {
                clearInterval(interval);
              }

              return !prevIsRunning;
            });

            return isRunning ? 5 * 60 : 25 * 60;
          }

          return prevTimer - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPaused, isRunning]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const toggleTimer = (): void => {
    setIsPaused((prevIsPaused) => !prevIsPaused);
  };

  const switchMode = (): void => {
    setIsRunning((previousValue) => !previousValue);
    setIsPaused(true);
    setTimer(isRunning ? 5 * 60 : 25 * 60);
  };

  const playPlaylist = async (uri: string): Promise<void> => {
    try {
      await Spicetify.Player.playUri(uri);
      Spicetify.showNotification("Playlist started.");
    } catch (error) {
      console.error("Could not play playlist:", error);
      Spicetify.showNotification("Could not start playlist.");
    }
  };

  return (
    <>
      <div className={styles.hero}>
        <button className={`${styles.button} ${styles.border_green}`} onClick={onEndStudy}>
          <span className={`${styles.circle} ${styles.green}`} />
          {"End Study"}
        </button>

        <button className={`${styles.button} ${styles.border_green}`} onClick={onChangeTheme}>
          <span className={`${styles.circle} ${styles.green}`} />
          {"Change Theme"}
        </button>

        <h1 className={styles.bigTitle}>Study Sessions with Study Banger</h1>
      </div>

      <div className={styles.container1}>
        <div className={styles.typetimer}>{isRunning ? "Work" : "Break"} Time!</div>
        <div className={styles.timer}>{formatTime(timer)}</div>

        <button className={styles.button1} onClick={toggleTimer}>
          {isPaused ? "Start" : "Pause"}
        </button>

        <button className={styles.button1} onClick={switchMode}>
          Switch to {isRunning ? "Break" : "Work"}
        </button>
      </div>

      <div className={styles.container}>
        <div className={styles.title}>{isRunning ? "Work" : "Break"} Music</div>

        <div className={styles.playlists}>
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              className={styles.card}
              onClick={() => {
                void playPlaylist(playlist.link);
              }}
            >
              <img className={styles.cardImage} src={playlist.image} alt={playlist.title} />

              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{playlist.title}</h3>
                <p className={styles.cardDescription}>{playlist.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default StudyTimePage;
