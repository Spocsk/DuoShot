import { beforeEach, expect, it, vi } from "vitest";
import v1 from "../scripts/v1-accepts.json";
import { main } from "./cli/render";

const effects = vi.hoisted(() => ({ readFile: vi.fn(), mkdir: vi.fn(), stat: vi.fn(), bundle: vi.fn(), prepare: vi.fn(), render: vi.fn(), select: vi.fn(), copy: vi.fn(), write: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: effects.readFile, mkdir: effects.mkdir, stat: effects.stat, copyFile: effects.copy, writeFile: effects.write }));
vi.mock("@remotion/bundler", () => ({ bundle: effects.bundle }));
vi.mock("@remotion/renderer", () => ({ renderMedia: effects.render, selectComposition: effects.select }));
vi.mock("../scripts/prepare-assets", () => ({ videoRoot: "/video", prepareAssets: effects.prepare }));

beforeEach(() => vi.resetAllMocks());
it.each(["duplicate", "collision"])("rejects %s outputs before preparation, filesystem writes or renderer calls", async (kind) => {
  effects.readFile.mockResolvedValueOnce(JSON.stringify({ ...v1, id: "demo" }));
  effects.readFile.mockResolvedValueOnce(JSON.stringify({ ...v1, id: kind === "duplicate" ? "demo" : "demo-tiktok" }));
  await expect(main(["one.json", "two.json"], {})).rejects.toThrow(kind === "duplicate" ? "Identifiant dupliqué" : "Collision de sortie");
  expect(effects.readFile).toHaveBeenCalledTimes(2);
  for (const [name, effect] of Object.entries(effects)) if (name !== "readFile") expect(effect).not.toHaveBeenCalled();
});
