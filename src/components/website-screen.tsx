"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useWebsite } from "@/components/use-website";
import { Tabs } from "@/components/ui/data";
import { Modal, Toast } from "@/components/ui/overlay";
import { fileProblem, resolveStoredType } from "@/lib/files";
import { qatarToday } from "@/lib/hr";
import {
  LIMITS,
  blogCategories,
  estimateMinutes,
  fileNameProblem,
  formatBytes,
  isDay,
  pick,
  siteDocCategories,
  sitePdfProblem,
  stripPdf,
  suggestFileName,
  type BlogCategory,
  type BlogPost,
  type BlogPostInput,
  type PublishState,
  type SiteDocCategory,
  type SiteDocument,
  type SiteDocumentInput,
} from "@/lib/website";
import { sampleDocuments, samplePosts } from "@/lib/website-samples";
import {
  clearBlogCover,
  clearSiteDocumentFile,
  createBlogPost,
  createSiteDocument,
  deleteBlogPost,
  deleteSiteDocument,
  openWebsiteFile,
  updateBlogPost,
  updateSiteDocument,
} from "@/server/website";

type Tab = "posts" | "documents";
type Errors = Record<string, string>;
type GetToken = () => Promise<string>;

/** Checks a file's first bytes, so a renamed file is caught before anything is saved. */
async function looksLike(file: File, kind: "image" | "pdf") {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (kind === "pdf") return ascii(0, 5) === "%PDF-";
  const png = head[0] === 0x89 && ascii(1, 4) === "PNG";
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const webp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return png || jpeg || webp;
}

/** Uploads a cover image or PDF to /api/website/files. Returns an error key or "". */
async function upload(getToken: GetToken, purpose: "cover" | "document", id: string, file: File) {
  const body = new FormData();
  body.set("token", await getToken());
  body.set("purpose", purpose);
  body.set("id", id);
  body.set("file", file);
  try {
    const response = await fetch("/api/website/files", { method: "POST", body });
    const payload = (await response.json()) as { ok: boolean; error?: string };
    return payload.ok ? "" : payload.error ?? "auth.failed";
  } catch {
    return "auth.failed";
  }
}

export function WebsiteScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { posts, documents, ready, canView, canEdit } = useWebsite();
  const [tab, setTab] = useState<Tab>("posts");
  const [editingPost, setEditingPost] = useState<BlogPost | "new" | null>(null);
  const [editingDoc, setEditingDoc] = useState<SiteDocument | "new" | null>(null);
  const [removing, setRemoving] = useState<{ kind: Tab; id: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);

  const publishedPosts = posts.filter((post) => post.status === "published").length;
  const publishedDocs = documents.filter((doc) => doc.status === "published" && doc.hasFile).length;

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      const token = await getToken();
      const result = removing.kind === "posts" ? await deleteBlogPost(token, removing.id) : await deleteSiteDocument(token, removing.id);
      if (!result.ok) setError(t(result.error));
      else notify(t("web.removed"), removing.title);
    } catch {
      setError(t("web.requestFailed"));
    }
    setRemoving(null);
  }

  if (ready && !canView) {
    return <AppShell title={t("nav.website")}><p className="muted">{t("common.forbidden")}</p></AppShell>;
  }

  return (
    <AppShell title={t("nav.website")}>
      <div className="web stack">
        <div className="page-header">
          <div>
            <span className="eyebrow">{t("web.eyebrow")}</span>
            <h2 className="page-title">{t("nav.website")}</h2>
            <p className="page-sub">
              {ready
                ? `${t("web.postCount", { count: publishedPosts })} · ${t("web.docCount", { count: publishedDocs })}`
                : t("common.loading")}
            </p>
          </div>
          <div className="hstack page-actions">
            <a className="btn btn--secondary" href={`/${locale}${tab === "posts" ? "/blogs" : "/resources"}`} target="_blank" rel="noopener">
              <Icon name="globe" />
              {t("web.viewSite")}
            </a>
            {canEdit ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => (tab === "posts" ? setEditingPost("new") : setEditingDoc("new"))}
              >
                <Icon name="plus" />
                {tab === "posts" ? t("web.newPost") : t("web.newDoc")}
              </button>
            ) : null}
          </div>
        </div>

        <Tabs
          items={[
            { id: "posts", label: `${t("web.tabPosts")} · ${posts.length}` },
            { id: "documents", label: `${t("web.tabDocs")} · ${documents.length}` },
          ]}
          value={tab}
          onChange={(id) => setTab(id as Tab)}
        />

        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

        {tab === "posts" ? (
          <PostsTable
            posts={posts}
            ready={ready}
            canEdit={canEdit}
            usingSamples={ready && publishedPosts === 0}
            onEdit={setEditingPost}
            onRemove={(post) => setRemoving({ kind: "posts", id: post.id, title: pick(post.titleEn, post.titleAr, locale) })}
          />
        ) : (
          <DocumentsTable
            documents={documents}
            ready={ready}
            canEdit={canEdit}
            usingSamples={ready && publishedDocs === 0}
            onEdit={setEditingDoc}
            onRemove={(doc) => setRemoving({ kind: "documents", id: doc.id, title: pick(doc.titleEn, doc.titleAr, locale) })}
          />
        )}

        <PostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={(title) => notify(t("web.saved"), title)}
          getToken={getToken}
        />
        <DocumentModal
          document={editingDoc}
          nextOrder={documents.length + 1}
          onClose={() => setEditingDoc(null)}
          onSaved={(title) => notify(t("web.saved"), title)}
          getToken={getToken}
        />
        <Modal open={removing !== null} title={removing?.kind === "posts" ? t("web.deletePostQ") : t("web.deleteDocQ")} onClose={() => setRemoving(null)}>
          <p className="muted">{t("web.deleteNote", { title: removing?.title ?? "" })}</p>
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => setRemoving(null)}>{t("btn.cancel")}</button>
            <button type="button" className="btn btn--primary" style={{ background: "var(--danger)" }} onClick={() => void confirmRemove()}>
              {t("us.delete")}
            </button>
          </div>
        </Modal>
        <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
      </div>
    </AppShell>
  );
}

function StatusBadge({ status, featured = false }: { status: PublishState; featured?: boolean }) {
  const t = useTranslations();
  return (
    <span className="hstack" style={{ gap: 6, flexWrap: "wrap" }}>
      <span className={`badge ${status === "published" ? "badge--ok" : "badge--neutral"}`}>{t(`web.status.${status}`)}</span>
      {featured ? <span className="badge badge--accent">{t("web.featured")}</span> : null}
    </span>
  );
}

function SampleNote({ text }: { text: string }) {
  return (
    <div className="ai">
      <Icon name="spark" />
      <span>{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------- Posts

function PostsTable({
  posts,
  ready,
  canEdit,
  usingSamples,
  onEdit,
  onRemove,
}: {
  posts: BlogPost[];
  ready: boolean;
  canEdit: boolean;
  usingSamples: boolean;
  onEdit: (post: BlogPost) => void;
  onRemove: (post: BlogPost) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();

  return (
    <>
      {usingSamples ? <SampleNote text={t("web.samplePosts", { count: samplePosts.length })} /> : null}
      <div className="card card--flush table-wrap">
        <table className="table table--cards">
          <thead>
            <tr>
              <th>{t("web.post")}</th>
              <th>{t("web.category")}</th>
              <th>{t("web.publishedOn")}</th>
              <th>{t("col.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!ready ? <tr><td colSpan={5}>{t("common.loading")}</td></tr> : null}
            {posts.map((post) => (
              <tr key={post.id}>
                <td data-label={t("web.post")}>
                  <div className="hstack">
                    <CoverThumb post={post} getToken={getToken} />
                    <div>
                      <b>{pick(post.titleEn, post.titleAr, locale)}</b>
                      <small className="muted" style={{ display: "block" }}>{locale === "ar" ? post.titleEn : post.titleAr}</small>
                    </div>
                  </div>
                </td>
                <td data-label={t("web.category")}><span className="badge badge--accent badge--plain">{t(`web.cat.${post.category}`)}</span></td>
                <td data-label={t("web.publishedOn")} className="num muted">{post.publishedOn}</td>
                <td data-label={t("col.status")}><StatusBadge status={post.status} featured={post.featured} /></td>
                <td className="end" data-label="">
                  <div className="hstack">
                    {post.status === "published" ? (
                      <a className="btn btn--ghost btn--sm" href={`/${locale}/blogs/${post.slug}`} target="_blank" rel="noopener">{t("web.view")}</a>
                    ) : null}
                    {canEdit ? (
                      <>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => onEdit(post)}>{t("us.edit")}</button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onRemove(post)}>{t("us.delete")}</button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {ready && usingSamples
              ? samplePosts.map((post) => (
                <tr key={post.slug} className="web-sample">
                  <td data-label={t("web.post")}>
                    <div className="hstack">
                      <img className="web-thumb" src={`/site/${post.photo}.jpg`} alt="" />
                      <div>
                        <b>{pick(post.titleEn, post.titleAr, locale)}</b>
                        <small className="muted" style={{ display: "block" }}>{locale === "ar" ? post.titleEn : post.titleAr}</small>
                      </div>
                    </div>
                  </td>
                  <td data-label={t("web.category")}><span className="badge badge--accent badge--plain">{t(`web.cat.${post.category}`)}</span></td>
                  <td data-label={t("web.publishedOn")} className="num muted">{post.publishedOn}</td>
                  <td data-label={t("col.status")}><span className="badge badge--info">{t("web.sample")}</span></td>
                  <td className="end" data-label="">
                    <a className="btn btn--ghost btn--sm" href={`/${locale}/blogs/${post.slug}`} target="_blank" rel="noopener">{t("web.view")}</a>
                  </td>
                </tr>
              ))
              : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CoverThumb({ post, getToken }: { post: BlogPost; getToken: GetToken }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!post.hasCover) return;
    let active = true;
    void (async () => {
      const result = await openWebsiteFile(await getToken(), "cover", post.id);
      if (active && result.ok) setUrl(result.url);
    })();
    return () => {
      active = false;
    };
    // Reload when the cover changes; getToken reads the current user when it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id, post.hasCover, post.coverType]);
  return url ? <img className="web-thumb" src={url} alt="" /> : <span className="web-thumb" aria-hidden="true" />;
}

const emptyPost = (): BlogPostInput => ({
  titleEn: "",
  titleAr: "",
  excerptEn: "",
  excerptAr: "",
  bodyEn: "",
  bodyAr: "",
  category: "planning",
  readMinutes: 0,
  publishedOn: qatarToday(),
  status: "published",
  featured: false,
  coverAltEn: "",
  coverAltAr: "",
});

function PostModal({
  post,
  onClose,
  onSaved,
  getToken,
}: {
  post: BlogPost | "new" | null;
  onClose: () => void;
  onSaved: (title: string) => void;
  getToken: GetToken;
}) {
  const t = useTranslations();
  const existing = post && post !== "new" ? post : null;
  return (
    <Modal open={post !== null} wide title={existing ? t("web.editPost") : t("web.newPost")} onClose={onClose}>
      {post ? <PostForm key={existing?.id ?? "new"} existing={existing} onClose={onClose} onSaved={onSaved} getToken={getToken} /> : null}
    </Modal>
  );
}

function PostForm({
  existing,
  onClose,
  onSaved,
  getToken,
}: {
  existing: BlogPost | null;
  onClose: () => void;
  onSaved: (title: string) => void;
  getToken: GetToken;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [form, setForm] = useState<BlogPostInput>(() => (existing ? { ...existing } : emptyPost()));
  const [cover, setCover] = useState<File | null>(null);
  const [dropCover, setDropCover] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");

  function set<K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  const keepsCover = Boolean(existing?.hasCover) && !dropCover;

  function validate() {
    const next: Errors = {};
    for (const key of ["titleEn", "titleAr", "excerptEn", "excerptAr", "bodyEn", "bodyAr"] as const) {
      if (!form[key].trim()) next[key] = "web.required";
    }
    if (form.titleEn.trim() && !/[a-z0-9]/i.test(form.titleEn)) next.titleEn = "web.titleLatin";
    if (!isDay(form.publishedOn)) next.publishedOn = "web.dateRequired";
    const minutes = Number(form.readMinutes);
    if (form.readMinutes && (!Number.isInteger(minutes) || minutes < 1 || minutes > LIMITS.readMinutes)) next.readMinutes = "web.minutesRange";
    if (form.status === "published" && !cover && !keepsCover) next.cover = "web.coverRequired";
    setErrors(next);
    return Object.values(next).every((value) => !value);
  }

  async function save() {
    try {
      await saveChanges();
    } catch {
      // The request itself failed (network, or the server refused it)
      setSaving(false);
      setFailure(t("web.requestFailed"));
    }
  }

  async function saveChanges() {
    if (saving || !validate()) return;
    setSaving(true);
    setFailure("");
    const token = await getToken();
    const id = existing?.id || savedId;
    const result = id ? await updateBlogPost(token, id, form) : await createBlogPost(token, form);
    if (!result.ok || !result.id) {
      setSaving(false);
      setFailure(t(result.ok ? "auth.failed" : result.error));
      return;
    }
    setSavedId(result.id);
    if (dropCover && !cover) {
      const cleared = await clearBlogCover(await getToken(), result.id);
      if (!cleared.ok) {
        setSaving(false);
        setFailure(t(cleared.error));
        return;
      }
    }
    if (cover) {
      const problem = await upload(getToken, "cover", result.id, cover);
      if (problem) {
        setSaving(false);
        setErrors((current) => ({ ...current, cover: problem }));
        return;
      }
    }
    setSaving(false);
    onSaved(pick(form.titleEn, form.titleAr, locale));
    onClose();
  }

  const estimate = estimateMinutes(form.bodyEn);

  return (
    <form className="stack" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <div className="form-grid form-grid--2">
        <TextField label={t("web.title")} lang="en" value={form.titleEn} max={LIMITS.title} error={errors.titleEn} onChange={(v) => set("titleEn", v)} />
        <TextField label={t("web.title")} lang="ar" value={form.titleAr} max={LIMITS.title} error={errors.titleAr} onChange={(v) => set("titleAr", v)} />
        <TextField label={t("web.excerpt")} lang="en" multiline rows={3} value={form.excerptEn} max={LIMITS.excerpt} error={errors.excerptEn} onChange={(v) => set("excerptEn", v)} />
        <TextField label={t("web.excerpt")} lang="ar" multiline rows={3} value={form.excerptAr} max={LIMITS.excerpt} error={errors.excerptAr} onChange={(v) => set("excerptAr", v)} />
        <TextField label={t("web.body")} lang="en" multiline rows={10} value={form.bodyEn} max={LIMITS.body} error={errors.bodyEn} onChange={(v) => set("bodyEn", v)} />
        <TextField label={t("web.body")} lang="ar" multiline rows={10} value={form.bodyAr} max={LIMITS.body} error={errors.bodyAr} onChange={(v) => set("bodyAr", v)} />
      </div>
      <p className="web-hint">{t("web.bodyHint")}</p>

      <div className="form-grid form-grid--2">
        <div className="field">
          <label htmlFor="post-category">{t("web.category")}</label>
          <select id="post-category" className="select" value={form.category} onChange={(e) => set("category", e.target.value as BlogCategory)}>
            {blogCategories.map((item) => <option key={item} value={item}>{t(`web.cat.${item}`)}</option>)}
          </select>
        </div>
        <div className={`field${errors.publishedOn ? " field--invalid" : ""}`}>
          <label htmlFor="post-date">{t("web.publishedOn")}</label>
          <input id="post-date" className="input" type="date" value={form.publishedOn} onChange={(e) => set("publishedOn", e.target.value)} />
          {errors.publishedOn ? <span className="field-error">{t(errors.publishedOn)}</span> : null}
        </div>
        <div className={`field${errors.readMinutes ? " field--invalid" : ""}`}>
          <label htmlFor="post-minutes">{t("web.readMinutes")}</label>
          <input
            id="post-minutes"
            className="input"
            type="number"
            min={1}
            max={LIMITS.readMinutes}
            placeholder={t("web.readAuto", { count: estimate })}
            value={form.readMinutes || ""}
            onChange={(e) => set("readMinutes", e.target.value ? Number(e.target.value) : 0)}
          />
          {errors.readMinutes ? <span className="field-error">{t(errors.readMinutes, { max: LIMITS.readMinutes })}</span> : null}
        </div>
        <div className="field">
          <label>{t("col.status")}</label>
          <StatusPick value={form.status} onChange={(v) => set("status", v)} />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
        <span>{t("web.featureLabel")}</span>
      </label>

      <ImagePick
        existing={existing && keepsCover ? existing : null}
        file={cover}
        error={errors.cover}
        getToken={getToken}
        onFile={(file) => {
          setCover(file);
          setErrors((current) => ({ ...current, cover: "" }));
          if (file) setDropCover(false);
        }}
        onError={(key) => setErrors((current) => ({ ...current, cover: key }))}
        onRemoveExisting={() => setDropCover(true)}
      />
      <div className="form-grid form-grid--2">
        <TextField label={t("web.coverAlt")} lang="en" value={form.coverAltEn} max={LIMITS.alt} onChange={(v) => set("coverAltEn", v)} />
        <TextField label={t("web.coverAlt")} lang="ar" value={form.coverAltAr} max={LIMITS.alt} onChange={(v) => set("coverAltAr", v)} />
      </div>

      {failure ? <p style={{ color: "var(--danger)" }}>{failure}</p> : null}
      <div className="hstack" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn--ghost" onClick={onClose}>{t("btn.cancel")}</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? t("web.saving") : existing ? t("set.save") : t("web.publish")}</button>
      </div>
    </form>
  );
}

function ImagePick({
  existing,
  file,
  error,
  getToken,
  onFile,
  onError,
  onRemoveExisting,
}: {
  existing: BlogPost | null;
  file: File | null;
  error?: string;
  getToken: GetToken;
  onFile: (file: File | null) => void;
  onError: (key: string) => void;
  onRemoveExisting: () => void;
}) {
  const t = useTranslations();
  const [stored, setStored] = useState("");
  const thumb = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => () => {
    if (thumb) URL.revokeObjectURL(thumb);
  }, [thumb]);

  useEffect(() => {
    if (!existing) return;
    let active = true;
    void (async () => {
      const result = await openWebsiteFile(await getToken(), "cover", existing.id);
      if (active && result.ok) setStored(result.url);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  async function choose(next: File | null) {
    if (!next) return onFile(null);
    const type = resolveStoredType(next.type, next.name);
    if (!type || !type.startsWith("image/")) return onError("web.imageOnly");
    if (fileProblem(next.type, next.size, next.name)) return onError("web.imageSize");
    if (!(await looksLike(next, "image"))) return onError("web.imageOnly");
    onFile(next);
  }

  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label>{t("web.cover")}</label>
      {file ? (
        <div className="file-chip">
          {thumb ? <img className="file-chip__thumb" src={thumb} alt="" /> : <span className="file-chip__thumb file-chip__thumb--icon"><Icon name="camera" /></span>}
          <div className="grow">
            <b>{file.name}</b>
            <small className="muted">{formatBytes(file.size, "en")}</small>
          </div>
          <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={() => onFile(null)}>
            <Icon name="x" className="icon icon--sm" />
          </button>
        </div>
      ) : existing ? (
        <div className="file-chip">
          {stored ? <img className="file-chip__thumb" src={stored} alt="" /> : <span className="file-chip__thumb file-chip__thumb--icon"><Icon name="camera" /></span>}
          <div className="grow">
            <b>{t("web.currentCover")}</b>
            <small className="muted">{t("web.replaceHint")}</small>
          </div>
          <label className="btn btn--ghost btn--sm" style={{ cursor: "pointer" }}>
            {t("web.replace")}
            <input type="file" hidden accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.currentTarget.value = ""; void choose(f); }} />
          </label>
          <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={onRemoveExisting}>
            <Icon name="x" className="icon icon--sm" />
          </button>
        </div>
      ) : (
        <label className="file-pick">
          <span className="btn btn--secondary btn--sm">{t("hr.fileChoose")}</span>
          <span className="file-pick__name">{t("hr.fileNone")}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.currentTarget.value = ""; void choose(f); }} />
        </label>
      )}
      <small className="muted">{t("web.coverHint")}</small>
      {error ? <span className="field-error">{t(error)}</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------- Documents

function DocumentsTable({
  documents,
  ready,
  canEdit,
  usingSamples,
  onEdit,
  onRemove,
}: {
  documents: SiteDocument[];
  ready: boolean;
  canEdit: boolean;
  usingSamples: boolean;
  onEdit: (doc: SiteDocument) => void;
  onRemove: (doc: SiteDocument) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();

  async function open(id: string) {
    const result = await openWebsiteFile(await getToken(), "document", id);
    if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      {usingSamples ? <SampleNote text={t("web.sampleDocs", { count: sampleDocuments.length })} /> : null}
      <div className="card card--flush table-wrap">
        <table className="table table--cards">
          <thead>
            <tr>
              <th>{t("web.document")}</th>
              <th>{t("web.category")}</th>
              <th>{t("web.file")}</th>
              <th>{t("col.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!ready ? <tr><td colSpan={5}>{t("common.loading")}</td></tr> : null}
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td data-label={t("web.document")}>
                  <b>{pick(doc.titleEn, doc.titleAr, locale)}</b>
                  <small className="muted" style={{ display: "block" }}>{locale === "ar" ? doc.titleEn : doc.titleAr}</small>
                </td>
                <td data-label={t("web.category")}><span className="badge badge--accent badge--plain">{t(`web.docCat.${doc.category}`)}</span></td>
                <td data-label={t("web.file")} className="muted">
                  {doc.hasFile ? (
                    <span dir="ltr">{doc.fileName}.pdf · {formatBytes(doc.size, locale)}</span>
                  ) : (
                    <span className="badge badge--warn">{t("web.noFile")}</span>
                  )}
                </td>
                <td data-label={t("col.status")}><StatusBadge status={doc.status} /></td>
                <td className="end" data-label="">
                  <div className="hstack">
                    {doc.hasFile ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => void open(doc.id)}>{t("hr.fileOpen")}</button> : null}
                    {canEdit ? (
                      <>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => onEdit(doc)}>{t("us.edit")}</button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onRemove(doc)}>{t("us.delete")}</button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {ready && usingSamples
              ? sampleDocuments.map((doc) => (
                <tr key={doc.titleEn} className="web-sample">
                  <td data-label={t("web.document")}>
                    <b>{pick(doc.titleEn, doc.titleAr, locale)}</b>
                    <small className="muted" style={{ display: "block" }}>{locale === "ar" ? doc.titleEn : doc.titleAr}</small>
                  </td>
                  <td data-label={t("web.category")}><span className="badge badge--accent badge--plain">{t(`web.docCat.${doc.category}`)}</span></td>
                  <td data-label={t("web.file")} className="muted">{t("web.onRequest")}</td>
                  <td data-label={t("col.status")}><span className="badge badge--info">{t("web.sample")}</span></td>
                  <td />
                </tr>
              ))
              : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

const emptyDocument = (order: number): SiteDocumentInput => ({
  titleEn: "",
  titleAr: "",
  descEn: "",
  descAr: "",
  category: "company",
  fileName: "",
  status: "published",
  order,
});

function DocumentModal({
  document,
  nextOrder,
  onClose,
  onSaved,
  getToken,
}: {
  document: SiteDocument | "new" | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (title: string) => void;
  getToken: GetToken;
}) {
  const t = useTranslations();
  const existing = document && document !== "new" ? document : null;
  return (
    <Modal open={document !== null} wide title={existing ? t("web.editDoc") : t("web.newDoc")} onClose={onClose}>
      {document ? (
        <DocumentForm key={existing?.id ?? "new"} existing={existing} nextOrder={nextOrder} onClose={onClose} onSaved={onSaved} getToken={getToken} />
      ) : null}
    </Modal>
  );
}

function DocumentForm({
  existing,
  nextOrder,
  onClose,
  onSaved,
  getToken,
}: {
  existing: SiteDocument | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (title: string) => void;
  getToken: GetToken;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [form, setForm] = useState<SiteDocumentInput>(() => (existing ? { ...existing } : emptyDocument(nextOrder)));
  const [file, setFile] = useState<File | null>(null);
  const [dropFile, setDropFile] = useState(false);
  const [nameTouched, setNameTouched] = useState(Boolean(existing?.fileName));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");

  function set<K extends keyof SiteDocumentInput>(key: K, value: SiteDocumentInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  const keepsFile = Boolean(existing?.hasFile) && !dropFile;

  async function choose(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    const problem = sitePdfProblem(next.type, next.size, next.name) ?? ((await looksLike(next, "pdf")) ? null : "web.pdfOnly");
    if (problem) {
      setErrors((current) => ({ ...current, file: problem }));
      return;
    }
    setFile(next);
    setDropFile(false);
    setErrors((current) => ({ ...current, file: "", fileName: "" }));
    if (!nameTouched || !form.fileName) setForm((current) => ({ ...current, fileName: suggestFileName(next.name) }));
  }

  function validate() {
    const next: Errors = {};
    for (const key of ["titleEn", "titleAr", "descEn", "descAr"] as const) {
      if (!form[key].trim()) next[key] = "web.required";
    }
    const nameIssue = fileNameProblem(form.fileName);
    if (nameIssue) next.fileName = nameIssue;
    if (form.status === "published" && !file && !keepsFile) next.file = "web.fileRequired";
    const order = Number(form.order);
    if (!Number.isInteger(order) || order < 0 || order > 999) next.order = "web.orderRange";
    setErrors(next);
    return Object.values(next).every((value) => !value);
  }

  async function save() {
    try {
      await saveChanges();
    } catch {
      // The request itself failed (network, or the server refused it)
      setSaving(false);
      setFailure(t("web.requestFailed"));
    }
  }

  async function saveChanges() {
    if (saving || !validate()) return;
    setSaving(true);
    setFailure("");
    const token = await getToken();
    const id = existing?.id || savedId;
    const input = { ...form, fileName: stripPdf(form.fileName.trim()) };
    const result = id ? await updateSiteDocument(token, id, input) : await createSiteDocument(token, input);
    if (!result.ok || !result.id) {
      setSaving(false);
      setFailure(t(result.ok ? "auth.failed" : result.error));
      return;
    }
    setSavedId(result.id);
    if (dropFile && !file) {
      const cleared = await clearSiteDocumentFile(await getToken(), result.id);
      if (!cleared.ok) {
        setSaving(false);
        setFailure(t(cleared.error));
        return;
      }
    }
    if (file) {
      const problem = await upload(getToken, "document", result.id, file);
      if (problem) {
        setSaving(false);
        setErrors((current) => ({ ...current, file: problem }));
        return;
      }
    }
    setSaving(false);
    onSaved(pick(form.titleEn, form.titleAr, locale));
    onClose();
  }

  async function openStored() {
    if (!existing) return;
    const result = await openWebsiteFile(await getToken(), "document", existing.id);
    if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <form className="stack" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <div className="form-grid form-grid--2">
        <TextField label={t("web.title")} lang="en" value={form.titleEn} max={LIMITS.title} error={errors.titleEn} onChange={(v) => set("titleEn", v)} />
        <TextField label={t("web.title")} lang="ar" value={form.titleAr} max={LIMITS.title} error={errors.titleAr} onChange={(v) => set("titleAr", v)} />
        <TextField label={t("web.description")} lang="en" multiline rows={3} value={form.descEn} max={LIMITS.docDesc} error={errors.descEn} onChange={(v) => set("descEn", v)} />
        <TextField label={t("web.description")} lang="ar" multiline rows={3} value={form.descAr} max={LIMITS.docDesc} error={errors.descAr} onChange={(v) => set("descAr", v)} />
      </div>
      <div className="form-grid form-grid--2">
        <div className="field">
          <label htmlFor="doc-category">{t("web.category")}</label>
          <select id="doc-category" className="select" value={form.category} onChange={(e) => set("category", e.target.value as SiteDocCategory)}>
            {siteDocCategories.map((item) => <option key={item} value={item}>{t(`web.docCat.${item}`)}</option>)}
          </select>
        </div>
        <div className={`field${errors.order ? " field--invalid" : ""}`}>
          <label htmlFor="doc-order">{t("web.order")}</label>
          <input id="doc-order" className="input" type="number" min={0} max={999} value={form.order} onChange={(e) => set("order", Number(e.target.value))} />
          {errors.order ? <span className="field-error">{t(errors.order)}</span> : <small className="muted">{t("web.orderHint")}</small>}
        </div>
        <div className="field">
          <label>{t("col.status")}</label>
          <StatusPick value={form.status} onChange={(v) => set("status", v)} />
        </div>
      </div>

      <div className={`field${errors.file ? " field--invalid" : ""}`}>
        <label>{t("web.pdf")}</label>
        {file ? (
          <div className="file-chip">
            <span className="file-chip__thumb file-chip__thumb--icon"><Icon name="report" /></span>
            <div className="grow">
              <b dir="ltr">{file.name}</b>
              <small className="muted">{formatBytes(file.size, locale)}</small>
            </div>
            <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={() => setFile(null)}>
              <Icon name="x" className="icon icon--sm" />
            </button>
          </div>
        ) : keepsFile && existing ? (
          <div className="file-chip">
            <span className="file-chip__thumb file-chip__thumb--icon"><Icon name="report" /></span>
            <div className="grow">
              <b dir="ltr">{existing.fileName}.pdf</b>
              <small className="muted">{formatBytes(existing.size, locale)}</small>
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void openStored()}>{t("hr.fileOpen")}</button>
            <label className="btn btn--ghost btn--sm" style={{ cursor: "pointer" }}>
              {t("web.replace")}
              <input type="file" hidden accept="application/pdf,.pdf" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.currentTarget.value = ""; void choose(f); }} />
            </label>
            <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={() => setDropFile(true)}>
              <Icon name="x" className="icon icon--sm" />
            </button>
          </div>
        ) : (
          <label className="file-pick">
            <span className="btn btn--secondary btn--sm">{t("hr.fileChoose")}</span>
            <span className="file-pick__name">{t("hr.fileNone")}</span>
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.currentTarget.value = ""; void choose(f); }} />
          </label>
        )}
        <small className="muted">{t("web.pdfHint")}</small>
        {errors.file ? <span className="field-error">{t(errors.file)}</span> : null}
      </div>

      <div className={`field${errors.fileName ? " field--invalid" : ""}`}>
        <label htmlFor="doc-file-name">{t("web.fileName")}</label>
        <div className="web-suffix" dir="ltr">
          <input
            id="doc-file-name"
            className="input grow"
            value={form.fileName}
            maxLength={LIMITS.fileName + 4}
            onChange={(e) => {
              setNameTouched(true);
              set("fileName", e.target.value);
            }}
            onBlur={() => form.fileName && set("fileName", stripPdf(form.fileName.trim()))}
          />
          <span>.pdf</span>
        </div>
        {errors.fileName ? (
          <span className="field-error">{t(errors.fileName, { max: LIMITS.fileName })}</span>
        ) : (
          <small className="muted">{t("web.fileNameHint")}</small>
        )}
      </div>

      {failure ? <p style={{ color: "var(--danger)" }}>{failure}</p> : null}
      <div className="hstack" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn--ghost" onClick={onClose}>{t("btn.cancel")}</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? t("web.saving") : existing ? t("set.save") : t("web.publish")}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Shared fields

function StatusPick({ value, onChange }: { value: PublishState; onChange: (value: PublishState) => void }) {
  const t = useTranslations();
  return (
    <div className="segmented" role="group">
      {(["published", "draft"] as const).map((item) => (
        <button key={item} type="button" aria-pressed={value === item} onClick={() => onChange(item)}>
          {t(`web.status.${item}`)}
        </button>
      ))}
    </div>
  );
}

/** One language of a bilingual field: label tagged EN/AR, input in that language's direction. */
function TextField({
  label,
  lang,
  value,
  max,
  error,
  multiline = false,
  rows = 3,
  onChange,
}: {
  label: string;
  lang: "en" | "ar";
  value: string;
  max: number;
  error?: string;
  multiline?: boolean;
  rows?: number;
  onChange: (value: string) => void;
}) {
  const t = useTranslations();
  const id = `${label}-${lang}`.replace(/\W+/g, "-");
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label htmlFor={id} className="web-lang">
        {label} <i>{lang === "ar" ? "عربي" : "EN"}</i>
      </label>
      {multiline ? (
        <textarea id={id} className="textarea" lang={lang} dir={dir} rows={rows} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" lang={lang} dir={dir} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {error ? <span className="field-error">{t(error)}</span> : null}
    </div>
  );
}
