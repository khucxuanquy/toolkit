"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, Icon, Tabs, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import {
  getSpeechRecognition,
  type SpeechRecognitionInstance,
  type SRResultEvent,
} from "./speech-recognition";

type Mode = "tts" | "stt";
type Lang = "vi-VN" | "en-US";

const LANGS: { value: Lang; label: string }[] = [
  { value: "vi-VN", label: "Tiếng Việt" },
  { value: "en-US", label: "English" },
];

export default function SpeechPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("tts");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex justify-center">
        <Tabs<Mode>
          items={[
            { value: "tts", label: t("st.tabTts") },
            { value: "stt", label: t("st.tabStt") },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      {mode === "tts" ? <TextToSpeech /> : <SpeechToText />}
    </div>
  );
}

/* --------------------------- Text → Speech --------------------------- */
function TextToSpeech() {
  const { t } = useTranslation();
  const [supported, setSupported] = useState(true);
  const [text, setText] = useState("");
  const [lang, setLang] = useState<Lang>("vi-VN");
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [speaking, setSpeaking] = useState(false);

  // Load the OS voices (async — they may arrive after a `voiceschanged` event).
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      const id = setTimeout(() => setSupported(false), 0);
      return () => clearTimeout(id);
    }
    const load = () => setVoices(window.speechSynthesis.getVoices());
    const id = setTimeout(load, 0);
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      clearTimeout(id);
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const langVoices = voices.filter((v) => v.lang.startsWith(lang.slice(0, 2)));

  const speak = () => {
    if (!text.trim() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const voice = voices.find((v) => v.voiceURI === voiceURI) ?? langVoices[0];
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const selectCls =
    "h-10 rounded-xl border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary";

  if (!supported) {
    return <Unsupported message={t("st.ttsUnsupported")} />;
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("st.ttsPlaceholder")}
          rows={5}
          className="border-border bg-surface focus-visible:border-primary w-full resize-y rounded-xl border p-3 text-sm outline-none"
        />

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted block text-xs">{t("st.language")}</span>
            <select
              className={selectCls}
              value={lang}
              onChange={(e) => {
                setLang(e.target.value as Lang);
                setVoiceURI("");
              }}
            >
              {LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          {langVoices.length > 0 && (
            <label className="space-y-1 text-sm">
              <span className="text-muted block text-xs">{t("st.voice")}</span>
              <select
                className={cn(selectCls, "max-w-48")}
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
              >
                <option value="">{t("st.autoVoice")}</option>
                {langVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex-1 space-y-1 text-sm">
            <span className="text-muted block text-xs">
              {t("st.rate")} ({rate.toFixed(1)}×)
            </span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="accent-primary h-10 w-full"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <Button onClick={speak} disabled={!text.trim()} className="flex-1">
            <Icon name="Volume2" size={18} /> {speaking ? t("st.speaking") : t("st.speak")}
          </Button>
          {speaking && (
            <Button variant="outline" onClick={stop}>
              <Icon name="Square" size={16} /> {t("st.stop")}
            </Button>
          )}
        </div>
        {langVoices.length === 0 && voices.length > 0 && (
          <p className="text-muted text-xs">{t("st.noVoice")}</p>
        )}
      </CardBody>
    </Card>
  );
}

/* --------------------------- Speech → Text --------------------------- */
function SpeechToText() {
  const { t } = useTranslation();
  const toast = useToast();
  const [lang, setLang] = useState<Lang>("vi-VN");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const Ctor = getSpeechRecognition();
  const supported = Boolean(Ctor);

  useEffect(() => {
    return () => recRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    if (!Ctor) return;
    setError(null);
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: SRResultEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText)
        setTranscript((prev) => (prev ? `${prev} ${finalText.trim()}` : finalText.trim()));
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      setError(e.error === "not-allowed" ? t("st.micDenied") : t("st.sttError"));
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [Ctor, lang, t]);

  const stop = () => recRef.current?.stop();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      toast(t("st.copied"), "success");
    } catch {
      /* ignore */
    }
  };

  if (!supported) {
    return <Unsupported message={t("st.sttUnsupported")} />;
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted block text-xs">{t("st.language")}</span>
            <select
              className="border-border bg-surface focus-visible:border-primary h-10 rounded-xl border px-2 text-sm outline-none disabled:opacity-50"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              disabled={listening}
            >
              {LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          {!listening ? (
            <Button onClick={start} className="mt-5">
              <Icon name="Mic" size={18} /> {t("st.listen")}
            </Button>
          ) : (
            <Button variant="danger" onClick={stop} className="mt-5">
              <span className="relative mr-1 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              {t("st.listening")}
            </Button>
          )}
        </div>

        {error && (
          <p className="border-danger/40 bg-danger/10 text-danger rounded-xl border p-3 text-sm">
            {error}
          </p>
        )}

        <div className="border-border min-h-32 rounded-xl border p-3 text-sm">
          {transcript || interim ? (
            <p className="whitespace-pre-wrap">
              {transcript} <span className="text-muted">{interim}</span>
            </p>
          ) : (
            <p className="text-muted">{t("st.sttPlaceholder")}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={copy} disabled={!transcript} className="flex-1">
            <Icon name="Copy" size={16} /> {t("st.copy")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setTranscript("");
              setInterim("");
            }}
            disabled={!transcript && !interim}
          >
            <Icon name="Trash2" size={16} /> {t("st.clear")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Unsupported({ message }: { message: string }) {
  return (
    <Card>
      <CardBody className="space-y-2 py-10 text-center">
        <Icon name="Mic" size={32} className="text-muted mx-auto" />
        <p className="text-muted text-sm">{message}</p>
      </CardBody>
    </Card>
  );
}
