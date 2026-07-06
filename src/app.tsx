import React, { useState } from "react";
import styles from "./css/app.module.scss";
import ReadyToStudyPage from "./ReadyToStudyPage";
import StudyTimePage from "./StudyTimePage";

const App: React.FC = () => {
  const [isStudyTime, setIsStudyTime] = useState(false);

  return (
    <main className={styles.appShell}>
      {isStudyTime ? (
        <StudyTimePage onEndStudy={() => setIsStudyTime(false)} />
      ) : (
        <ReadyToStudyPage onStartStudy={() => setIsStudyTime(true)} />
      )}
    </main>
  );
};

export default App;
