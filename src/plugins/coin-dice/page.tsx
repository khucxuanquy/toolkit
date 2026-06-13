"use client";

import { useState } from "react";
import { Card, CardBody, Tabs } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { Coin3D } from "./Coin3D";
import { Dice3D } from "./Dice3D";

type Mode = "coin" | "dice";

export default function CoinDicePage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("coin");
  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex justify-center">
        <Tabs<Mode>
          items={[
            { value: "coin", label: t("cd.tabCoin") },
            { value: "dice", label: t("cd.tabDice") },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      <Card>
        <CardBody className="py-8">{mode === "coin" ? <Coin3D /> : <Dice3D />}</CardBody>
      </Card>
    </div>
  );
}
