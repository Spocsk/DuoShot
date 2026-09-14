import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { hashFromBuffer } from "./clone-hash";
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
    const distance = hammingDistance(await hashFromBuffer(stripes), await hashFromBuffer(spots));
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
    const distance = hammingDistance(await hashFromBuffer(source), await hashFromBuffer(stretched));
    expect(labelFromDistance(distance) === "ok").toBe(false);
  });

  it("forces risk when the same-set toggle is on", () => {
    expect(labelFromDistance(40, true)).toBe("risk");
    expect(worstCloneLabel([{ index: 0, distance: 40, label: "ok" }])).toBe("ok");
  });
});
