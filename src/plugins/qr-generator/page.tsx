"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardBody, Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";

export default function QrGeneratorPage() {
  const { t } = useTranslation();
  const [text, setText] = useState("https://quy.io.vn");
  const wrapRef = useRef<HTMLDivElement>(null);
  const value = text.trim();

  const download = () => {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "qr.png";
    a.click();
  };

  return (
    <div className="mx-auto grid max-w-2xl gap-5 md:grid-cols-2">
      <Card>
        <CardBody className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("qr.label")}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={t("qr.placeholder")}
              className="border-border bg-surface focus-visible:border-primary focus-visible:ring-ring w-full resize-none rounded-xl border p-3 text-sm outline-none focus-visible:ring-2"
            />
          </label>
          <Button onClick={download} disabled={!value} className="w-full">
            <Icon name="Download" size={18} /> {t("qr.download")}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex items-center justify-center">
          {value ? (
            <div ref={wrapRef} className="rounded-2xl bg-white p-4 shadow-sm">
              <QRCodeCanvas value={value} size={224} level="M" marginSize={1} />
            </div>
          ) : (
            <p className="text-muted py-16 text-center text-sm">{t("qr.empty")}</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
