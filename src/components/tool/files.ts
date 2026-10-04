
export function takeFiles(list: FileList | File[] | DataTransfer | null | undefined): File[] {
  if (!list) return [];
  if (typeof DataTransfer !== "undefined" && list instanceof DataTransfer) {
    const fromFiles = Array.from(list.files);
    if (fromFiles.length) return fromFiles;
    const fromItems: File[] = [];
    for (const item of Array.from(list.items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) fromItems.push(file);
      }
    }
    return fromItems;
  }
  return Array.from(list as FileList | File[]);
}

export function isAllowedImage(file: File) {
  return /image\/(png|jpeg)/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
}
