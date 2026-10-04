import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { hashFromBuffer } from "./clone-hash";
import { harborSlidePng } from "./harbor";
import { hammingDistance, labelFromDistance, scorePair, worstCloneLabel } from "./clone-score";

async function solid(color: { r: number; g: number; b: number }, width = 80, height = 120) {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

describe("clone-score", () => {
  it("labels identical images as risk", async () => {
    const a = await solid({ r: 40, g: 80, b: 120 });
    const hash = await hashFromBuffer(a);
    const result = scorePair(hash, hash, 0);
    expect(result.label).toBe("risk");
    expect(result.distance).toBe(0);
  });

  it("labels distinct patterns as ok", async () => {
    const stripes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 20, g: 20, b: 20 } },
    })
      .composite(
        Array.from({ length: 8 }, (_, i) => ({
          input: Buffer.from(
            `<svg width="64" height="4"><rect width="64" height="4" fill="${i % 2 ? "#f2eadf" : "#1c2428"}"/></svg>`,
          ),
          top: i * 8,
          left: 0,
        })),
      )
      .png()
      .toBuffer();
    const spots = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 240, g: 230, b: 210 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 18, height: 18, channels: 3, background: { r: 30, g: 90, b: 70 } },
          })
            .png()
            .toBuffer(),
          top: 8,
          left: 8,
        },
        {
          input: await sharp({
            create: { width: 22, height: 10, channels: 3, background: { r: 180, g: 60, b: 40 } },
          })
            .png()
            .toBuffer(),
          top: 40,
          left: 30,
        },
      ])
      .png()
      .toBuffer();
    const distance = hammingDistance((await hashFromBuffer(stripes)).hash, (await hashFromBuffer(spots)).hash);
    expect(labelFromDistance(distance)).toBe("ok");
  });

  it("treats a stretched clone as at least review", async () => {
    const source = await sharp({
      create: { width: 40, height: 80, channels: 3, background: { r: 12, g: 12, b: 12 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 18, height: 30, channels: 3, background: { r: 240, g: 230, b: 210 } },
          })
            .png()
            .toBuffer(),
          top: 8,
          left: 11,
        },
      ])
      .png()
      .toBuffer();
    const stretched = await sharp(source).resize(120, 40, { fit: "fill" }).png().toBuffer();
    const distance = hammingDistance((await hashFromBuffer(source)).hash, (await hashFromBuffer(stretched)).hash);
    expect(labelFromDistance(distance) === "ok").toBe(false);
  });

  it("forces risk when the same-set toggle is on", () => {
    expect(labelFromDistance(40, true)).toBe("risk");
    expect(worstCloneLabel([{ index: 0, distance: 40, label: "ok" }])).toBe("ok");
    expect(scorePair(BigInt(0), BigInt(255), 0, true)).toMatchObject({ label: "risk", reason: "same-set" });
  });

  it("does not flag a blue and a brown screen as strongly similar", async () => {
    const blue = await hashFromBuffer(await solid({ r: 24, g: 88, b: 196 }, 1398, 2034));
    const brown = await hashFromBuffer(await solid({ r: 120, g: 72, b: 40 }, 2007, 2853));
    const result = scorePair(blue, brown, 0);
    expect(result.label).toBe("ok");
    expect(result.reason).toBe("distinct");
  });

  it("keeps the Harbor demo pairs and the e2e fixtures out of the risk band", async () => {
    for (const index of [0, 1, 2]) {
      const outer = await hashFromBuffer((await harborSlidePng(index, "outer"))!);
      const inner = await hashFromBuffer((await harborSlidePng(index, "inner"))!);
      expect(scorePair(outer, inner, index).label).not.toBe("risk");
    }
    const pink = await hashFromBuffer(readFileSync("cypress/fixtures/outer.png"));
    const blue = await hashFromBuffer(readFileSync("cypress/fixtures/inner.png"));
    expect(scorePair(pink, blue, 0)).toMatchObject({ label: "ok", reason: "distinct" });
  });

  it("explains near-uniform images by their palette", async () => {
    const a = await hashFromBuffer(await solid({ r: 24, g: 88, b: 196 }));
    const b = await hashFromBuffer(await solid({ r: 30, g: 92, b: 200 }));
    expect(scorePair(a, b, 0)).toMatchObject({ label: "risk", reason: "palette" });
  });

  it("flags the same layout in the same colours and softens it when recoloured", async () => {
    const card = (bg: { r: number; g: number; b: number }, fg: string) => sharp({
      create: { width: 90, height: 160, channels: 3, background: bg },
    })
      .composite([
        { input: Buffer.from(`<svg width="60" height="40"><rect width="60" height="40" fill="${fg}"/></svg>`), top: 20, left: 15 },
        { input: Buffer.from(`<svg width="30" height="60"><rect width="30" height="60" fill="${fg}"/></svg>`), top: 80, left: 50 },
      ])
      .png()
      .toBuffer();
    const light = await hashFromBuffer(await card({ r: 240, g: 236, b: 228 }, "#1c2428"));
    const lightCopy = await hashFromBuffer(await card({ r: 236, g: 232, b: 226 }, "#1c2428"));
    expect(scorePair(light, lightCopy, 0)).toMatchObject({ label: "risk", reason: "layout-and-palette" });
    const recoloured = await hashFromBuffer(await card({ r: 200, g: 60, b: 40 }, "#0a1a50"));
    const result = scorePair(light, recoloured, 0);
    expect(result.label).not.toBe("risk");
  });
});
