import sharp from "sharp";
import { dHashFromGray } from "./clone-score";

export async function hashFromBuffer(input: Buffer): Promise<bigint> {
  const { data } = await sharp(input, { failOn: "none" })
    .rotate()
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return dHashFromGray(data, 9, 8);
}
