import React from "react";
import styles from "./css/app.module.scss";

interface Props {
  onStartStudy: () => void;
}

const ReadyToStudyPage: React.FC<Props> = ({ onStartStudy }) => {
  return (
    <section className={styles.readyGrid}>
      <div className={styles.glassPanel}>
        <div className={styles.appMark} aria-hidden="true">
          SB
        </div>

        <p className={styles.eyebrow}>Study Banger</p>
        <h1 className={styles.readyTitle}>Ready to focus?</h1>
        <p className={styles.readyText}>
          Start a clean study session. Timer presets, custom durations, playlists and the minimal
          focus view are available after starting.
        </p>

        <button className={styles.primaryButton} onClick={onStartStudy}>
          Start study session
        </button>
      </div>

      <div className={`${styles.glassPanel} ${styles.focusPreview}`}>
        <div className={styles.orbit}>
          <div className={styles.orbitCore}>25</div>
        </div>

        <h2>Dashboard + Focus view</h2>
        <p>
          Use the dashboard for setup. Switch to Focus view when you only want the timer, current
          track and optional clock/date.
        </p>
      </div>
    </section>
  );
};

export default ReadyToStudyPage;
