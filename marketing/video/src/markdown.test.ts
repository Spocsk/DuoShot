import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import v1 from "../scripts/v1-accepts.json";
import v2 from "../scripts/v2-real.json";
import { convertMarkdown } from "./markdown";
import { validateScript } from "./schema";

const example = readFileSync(new URL("../scripts-example.md", import.meta.url), "utf8");
describe("Markdown conversion", () => {
  it("produces equivalent example scripts, including dimensions and defaults", () => {
    expect(convertMarkdown(example)).toEqual([validateScript(v1), validateScript(v2)]);
  });
  it("supports hyphens, straight quotes and dots inside text", () => {
    const converted = convertMarkdown(example.replaceAll("–", "-").replaceAll("« ", '"').replaceAll(" »", '"'));
    expect(converted[0].scenes[3].text).toBe("One size or a mix · up to 10 per size");
  });
  it("accepts ZIP filenames without dimensions", () => {
    const [script] = convertMarkdown("## zip-demo · en · 15 s\nFin : " + v1.endUrl + "\n1. 0–15 s · zip shot-01.png shot-02.jpg");
    expect(script.scenes[0]).toMatchObject({ files: [{ name: "shot-01.png", format: "png" }, { name: "shot-02.jpg", format: "jpeg" }] });
  });
  it("reports the scene line for editorial errors", () => {
    expect(() => convertMarkdown(example.replace("iPhone Duo ships Oct 23", "required"))).toThrow("Ligne 4");
  });
  it("reports title errors on the Titre line, including a later block", () => {
    expect(() => convertMarkdown(example.replace("What iPhone Duo accepts", "6 inches"))).toThrow("Ligne 2 (v1-accepts) : title");
    expect(() => convertMarkdown(example.replace("From your real screenshots", "coupon"))).toThrow("Ligne 11 (v2-real) : title");
  });
  it("reports too-short scenes on their own line", () => {
    expect(() => convertMarkdown(example.replace("0–3", "0–0.4").replace("3–7", "0.4–7"))).toThrow("Ligne 4 (v1-accepts) : scenes.0.durationSec");
  });
  it("reports malformed ranges and missing references", () => {
    expect(() => convertMarkdown(example.replace("3–7", "4–7"))).toThrow("Ligne 5");
    expect(() => convertMarkdown(example.replace("outer harbor:en:1:outer", "outer"))).toThrow("Ligne 5");
  });
  it("rejects duplicate block ids", () => expect(() => convertMarkdown(example + "\n" + example)).toThrow("Identifiant dupliqué"));
});
