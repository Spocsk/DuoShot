const IMAGE_TYPE = /^image\/(png|jpeg)$/i;
const IMAGE_NAME = /\.(png|jpe?g)$/i;

export function isAllowedImage(file: File): boolean {
  return IMAGE_TYPE.test(file.type) || IMAGE_NAME.test(file.name);
}

export function fileSortKey(file: File): string {
  return (file.webkitRelativePath || file.name).toLowerCase();
}

export function sortDroppedFiles(files: File[]): File[] {
  return [...files].sort((a, b) => fileSortKey(a).localeCompare(fileSortKey(b), undefined, { numeric: true }));
}

export function partitionDroppedFiles(files: File[]): { images: File[]; rejected: File[] } {
  const images: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    if (isAllowedImage(file)) images.push(file);
    else rejected.push(file);
  }
  return { images: sortDroppedFiles(images), rejected };
}

type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  file?: (ok: (file: File) => void, err?: () => void) => void;
  createReader?: () => {
    readEntries: (ok: (entries: FileSystemEntryLike[]) => void, err?: () => void) => void;
  };
};

async function walkEntry(entry: FileSystemEntryLike): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      if (!entry.file) {
        resolve([]);
        return;
      }
      entry.file((file) => resolve([file]), () => resolve([]));
    });
  }
  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    const collected: File[] = [];
    const batch = (): Promise<FileSystemEntryLike[]> =>
      new Promise((resolve) => {
        reader.readEntries((entries) => resolve(entries), () => resolve([]));
      });
    let entries = await batch();
    while (entries.length) {
      for (const child of entries) {
        collected.push(...(await walkEntry(child)));
      }
      entries = await batch();
    }
    return collected;
  }
  return [];
}

export async function collectDroppedFiles(data: DataTransfer | FileList | File[] | null | undefined): Promise<File[]> {
  if (!data) return [];
  if (Array.isArray(data)) return sortDroppedFiles(data);
  if (typeof FileList !== "undefined" && data instanceof FileList) {
    return sortDroppedFiles(Array.from(data));
  }
  if (typeof DataTransfer !== "undefined" && data instanceof DataTransfer) {
    const items = Array.from(data.items);
    const fromEntries: File[] = [];
    for (const item of items) {
      const getter = (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntryLike | null }).webkitGetAsEntry;
      const entry = getter?.call(item) ?? null;
      if (entry) fromEntries.push(...(await walkEntry(entry)));
    }
    if (fromEntries.length) return sortDroppedFiles(fromEntries);
    return sortDroppedFiles(Array.from(data.files));
  }
  return [];
}
