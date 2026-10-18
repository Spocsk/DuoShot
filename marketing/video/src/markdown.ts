import { validateScript, type VideoScript } from "./schema";

interface Block {
  line: number;
  script: { id: string; title?: string; lang: string; durationSec: number; endUrl: string; scenes: Record<string, unknown>[] };
  sceneLines: number[];
  endLine?: number;
  titleLine?: number;
  lastEnd: number;
}

function lineError(line: number, message: string): never { throw new Error(`Ligne ${line} : ${message}`); }

/** Parse every block before the caller writes any output. */
export function convertMarkdown(markdown: string): VideoScript[] {
  const blocks: Block[] = [];
  let current: Block | undefined;
  markdown.replace(/^\uFEFF/, "").split(/\r?\n/).forEach((source, i) => {
    const line = i + 1;
    const text = source.trim();
    if (!text || text.startsWith("# ") || text.startsWith("<!--")) return;
    if (text.startsWith("## ")) {
      const header = /^##\s+([a-z0-9]+(?:-[a-z0-9]+)*)\s*·\s*(en|fr)\s*·\s*(\d+(?:[.,]\d+)?)\s*s\s*$/.exec(text);
      if (!header) lineError(line, "En-tête attendu : ## identifiant · en|fr · 18 s");
      current = { line, script: { id: header[1], lang: header[2], durationSec: Number(header[3].replace(",", ".")), endUrl: "", scenes: [] }, sceneLines: [], lastEnd: 0 };
      blocks.push(current);
      return;
    }
    if (!current) lineError(line, "Commencez par un bloc ## identifiant · en|fr · durée s.");
    const title = /^Titre\s*:\s*(.+)$/iu.exec(text);
    if (title) { current.script.title = title[1]; current.titleLine = line; return; }
    const end = /^Fin\s*:\s*(\S+)\s*$/iu.exec(text);
    if (end) {
      if (current.endLine) lineError(line, "Une seule URL Fin est autorisée par vidéo.");
      current.script.endUrl = end[1].replace(/<(?:plateforme|platform)>/gi, "{platform}");
      current.endLine = line;
      return;
    }
    // Delimit the quoted copy from the right so its middle dots remain intact.
    const match = /^(\d+)\.\s*(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*s\s*·\s*([a-z-]+)(.*)$/u.exec(text);
    if (!match) lineError(line, "Scène attendue : 1. 0–3 s · title · « Texte »");
    if (Number(match[1]) !== current.script.scenes.length + 1) lineError(line, "La numérotation des scènes doit être continue et commencer à 1.");
    const start = Number(match[2].replace(",", "."));
    const finish = Number(match[3].replace(",", "."));
    if (Math.abs(start - current.lastEnd) > 0.000001 || finish <= start) lineError(line, "Les plages doivent être positives, continues et commencer à 0 s.");
    let remainder = match[5].trim();
    let copy: string | undefined;
    const quoted = /^(.*?)\s*·\s*(?:«\s*([\s\S]*?)\s*»|"([\s\S]*?)")\s*$/u.exec(remainder);
    if (quoted) { remainder = quoted[1].trim(); copy = quoted[2] ?? quoted[3]; }
    if (/[«»"]/.test(remainder)) lineError(line, "Texte mal délimité : utilisez · « Texte » ou · \"Texte\".");
    const refs = remainder ? remainder.split(/\s+/) : [];
    const type = match[4];
    const scene: Record<string, unknown> = { type, durationSec: finish - start, ...(copy === undefined ? {} : { text: copy }) };
    const fields: Record<string, string[]> = {
      title: [], end: [], outer: ["capture"], inner: ["capture"], classic: ["capture"],
      "outer-to-inner": ["outer", "inner"], "side-by-side": ["outer", "inner"],
      "before-after": ["before", "after"], reframe: ["classic", "outer", "inner"],
    };
    if (type === "zip") {
      scene.files = refs.map((ref) => {
        // Optional @WIDTH×HEIGHT preserves file dimensions in Markdown round trips.
        const file = /^(.+\.(png|jpe?g))(?:@(\d+[×x]\d+))?$/iu.exec(ref);
        if (!file) lineError(line, `Fichier ZIP attendu : nom.png ou nom.jpg[@1398×2034], reçu ${ref}`);
        return { name: file[1], format: file[2].toLowerCase() === "png" ? "png" : "jpeg", ...(file[3] ? { dims: file[3].replace("x", "×") } : {}) };
      });
    } else {
      if (!Object.hasOwn(fields, type)) lineError(line, `Type de scène inconnu : ${type}`);
      if (refs.length !== fields[type].length) lineError(line, `${type} attend ${fields[type].length} référence(s) dans l’ordre : ${fields[type].join(", ") || "aucune"}.`);
      fields[type].forEach((field, n) => { scene[field] = refs[n]; });
    }
    current.script.scenes.push(scene);
    current.sceneLines.push(line);
    current.lastEnd = finish;
  });
  if (!blocks.length) lineError(1, "Aucun bloc vidéo ## trouvé.");
  const ids = new Set<string>();
  return blocks.map((block) => {
    if (ids.has(block.script.id)) lineError(block.line, `Identifiant dupliqué : ${block.script.id}`);
    ids.add(block.script.id);
    try { return validateScript(block.script); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message.split("\n").map((issue) => {
        const scene = /^scenes\.(\d+)/.exec(issue);
        const line = scene ? block.sceneLines[Number(scene[1])] : issue.startsWith("title") ? block.titleLine ?? block.line : issue.startsWith("endUrl") ? block.endLine ?? block.line : block.line;
        return `Ligne ${line} (${block.script.id}) : ${issue}`;
      }).join("\n"));
    }
  });
}
