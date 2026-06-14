"use client";

import { useState } from "react";
import { Card, CardBody, Tabs } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { CountdownTimer } from "./components/CountdownTimer";
import { Stopwatch } from "./components/Stopwatch";

type Mode = "timer" | "stopwatch";

export default function TimerPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("timer");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex justify-center">
        <Tabs<Mode>
          items={[
            { value: "timer", label: t("timer.tabTimer") },
            { value: "stopwatch", label: t("timer.tabStopwatch") },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      <Card>
        <CardBody className="py-8">
          {mode === "timer" ? <CountdownTimer /> : <Stopwatch />}
        </CardBody>
      </Card>
    </div>
  );
}
