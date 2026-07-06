import React, { useState } from "react";
import ReadyToStudyPage from "./ReadyToStudyPage";
import StudyTimePage from "./StudyTimePage";

type ThemeSection = Record<string, string>;
type ThemeConfig = Record<string, ThemeSection>;

const hexToRGB = (hex: string): number[] => {
  let normalizedHex = hex.trim().replace(/^#/, "");

  if (normalizedHex.length === 3) {
    normalizedHex = normalizedHex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (normalizedHex.length !== 6) {
    throw new Error("Only 3- or 6-digit hex colours are allowed.");
  }

  if (/[^0-9a-f]/i.test(normalizedHex)) {
    throw new Error("Only hex colours are allowed.");
  }

  const rgbHex = normalizedHex.match(/.{1,2}/g);

  if (!rgbHex || rgbHex.length !== 3) {
    throw new Error("Could not parse hex colour.");
  }

  return rgbHex.map((channel) => parseInt(channel, 16));
};

const parseColorIni = (colorIni: string): ThemeConfig => {
  const regex = {
    section: /^\s*\[\s*([^\]]*)\s*\]\s*$/,
    param: /^\s*([^=]+?)\s*=\s*(.*?)\s*$/,
    comment: /^\s*;.*$/,
  };

  const value: ThemeConfig = {};
  let section: string | null = null;

  colorIni.split(/[\r\n]+/).forEach((line) => {
    if (regex.comment.test(line)) {
      return;
    }

    const sectionMatch = line.match(regex.section);
    if (sectionMatch) {
      section = sectionMatch[1];
      value[section] = {};
      return;
    }

    const paramMatch = line.match(regex.param);
    if (paramMatch) {
      if (line.includes("xrdb")) {
        if (section) {
          delete value[section];
        }

        section = null;
        return;
      }

      if (!section) {
        return;
      }

      if (!value[section]) {
        value[section] = {};
      }

      value[section][paramMatch[1].trim()] = paramMatch[2].split(";")[0].trim();
      return;
    }

    if (line.length === 0 && section) {
      section = null;
    }
  });

  return value;
};

const toggleLateNightTheme = async (): Promise<void> => {
  const existingColorScheme = document.querySelector("#StarryNightColors");
  const existingUserCSS = document.querySelector("#StarryNightCSS");
  const existingScript = document.querySelector("#StarryNightScript");

  if (existingColorScheme || existingUserCSS || existingScript) {
    location.reload();
    return;
  }

  document.querySelectorAll(".marketplaceCSS").forEach((element) => element.remove());
  document.querySelectorAll(".userCSS").forEach((element) => element.remove());

  try {
    const color = await fetch(
      `https://raw.githubusercontent.com/spicetify/spicetify-themes/master/StarryNight/color.ini?time=${Date.now()}`,
    ).then((response) => response.text());

    const value = parseColorIni(color);
    const baseScheme = value.base;

    if (!baseScheme) {
      Spicetify.showNotification("StarryNight color scheme could not be loaded.");
      return;
    }

    const colorStyle = document.createElement("style");
    let injectStr = ":root {";

    Object.keys(baseScheme).forEach((key) => {
      injectStr += `--spice-${key}: #${baseScheme[key]};`;
      injectStr += `--spice-rgb-${key}: ${hexToRGB(baseScheme[key]).join(",")};`;
    });

    injectStr += "}";
    colorStyle.innerHTML = injectStr;
    colorStyle.id = "StarryNightColors";
    document.body.appendChild(colorStyle);

    const css = await fetch(
      `https://raw.githubusercontent.com/spicetify/spicetify-themes/master/StarryNight/user.css?time=${Date.now()}`,
    ).then((response) => response.text());

    const userCssTag = document.createElement("style");
    userCssTag.id = "StarryNightCSS";
    userCssTag.innerHTML = css;
    document.body.appendChild(userCssTag);

    const externalJS = await fetch(
      `https://raw.githubusercontent.com/spicetify/spicetify-themes/master/StarryNight/theme.js?time=${Date.now()}`,
    ).then((response) => response.text());

    const script = document.createElement("script");
    script.textContent = externalJS;
    script.async = true;
    script.id = "StarryNightScript";
    document.head.appendChild(script);
  } catch (error) {
    console.error("Could not load StarryNight theme:", error);
    Spicetify.showNotification("Could not load StarryNight theme.");
  }
};

const App: React.FC = () => {
  const [isStudyTime, setIsStudyTime] = useState(false);

  const toggleStudyTime = (): void => {
    setIsStudyTime((previousValue) => !previousValue);
  };

  if (isStudyTime) {
    return (
      <StudyTimePage
        onEndStudy={toggleStudyTime}
        onChangeTheme={() => {
          void toggleLateNightTheme();
        }}
      />
    );
  }

  return <ReadyToStudyPage onStartStudy={toggleStudyTime} />;
};

export default App;
