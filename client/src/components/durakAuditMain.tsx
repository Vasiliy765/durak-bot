import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import DurakAuditFixture from "@/components/game-center/DurakAuditFixture";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DurakAuditFixture />
  </StrictMode>
);
