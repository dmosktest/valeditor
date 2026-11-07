declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    addVirtualFileSystem: (vfs: unknown) => void;
    setFonts: (fonts: Record<string, Record<string, string>>) => void;
    createPdf: (doc: unknown) => { download: (name?: string) => Promise<void> };
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
