declare global {
  interface Navigator {
    msSaveOrOpenBlob: (blobOrBase64: Blob | string, filename: string) => void;
    msSaveBlob?: (blob: any, defaultName?: string) => boolean;
  }
}
export {};
