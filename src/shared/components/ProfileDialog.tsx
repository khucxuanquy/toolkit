"use client";

import { useRef, useState } from "react";
import { Modal, Button, Input, Icon, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { useAuthStore } from "@/core/auth/auth-store";

function errorKey(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  return msg.startsWith("auth.err.") ? msg : "auth.err.generic";
}

/** Edit the signed-in user's nickname + avatar. Mounted only while open. */
export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [name, setName] = useState(user?.name ?? "");
  const [preview, setPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);

  const pick = (f: File) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(f);
    objectUrl.current = url;
    setFile(f);
    setRemoveAvatar(false);
    setPreview(url);
  };

  const clearPhoto = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setFile(null);
    setRemoveAvatar(true);
    setPreview(null);
  };

  const close = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    onClose();
  };

  const save = async () => {
    setPending(true);
    try {
      await updateProfile({
        name,
        avatarFile: file ?? undefined,
        removeAvatar: removeAvatar && !file,
      });
      toast(t("profile.saved"), "success");
      close();
    } catch (e) {
      toast(t(errorKey(e)), "error");
      setPending(false);
    }
  };

  return (
    <Modal open onClose={close} title={t("profile.edit")} className="max-w-sm">
      <div className="space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="border-border h-20 w-20 rounded-full border object-cover"
            />
          ) : (
            <span className="from-primary to-accent flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-white">
              {(name || user?.email || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Icon name="Upload" size={15} /> {t("profile.changePhoto")}
            </Button>
            {preview && (
              <Button variant="ghost" size="sm" onClick={clearPhoto}>
                <Icon name="Trash2" size={15} /> {t("profile.removePhoto")}
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Nickname */}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("profile.nickname")}</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("profile.nickname")}
            maxLength={40}
          />
        </label>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={close} disabled={pending}>
            {t("profile.cancel")}
          </Button>
          <Button className="flex-1" onClick={save} disabled={pending || !name.trim()}>
            {pending ? t("auth.processing") : t("profile.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
