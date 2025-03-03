"use client";

import { Sidebar } from "@/components/Sidebar";
import { Editor } from "@/components/Editor";
import { useTheme } from "@/theme/ThemeContext";

export default function Home() {
  const { theme } = useTheme();

  return (
    <main
      className={`h-screen flex ${
        theme === "light" ? "vintage-texture" : "star-field"
      }`}
    >
      <Sidebar />
      <Editor />
    </main>
  );
}
