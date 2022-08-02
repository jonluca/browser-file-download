import pLimit from "p-limit";
const root =
  typeof window === "object"
    ? window
    : typeof self === "object"
    ? self
    : typeof globalThis === "object"
    ? globalThis
    : undefined;

const attemptToAddUnicodeBOM = (blob) => {
  // prepend BOM text/* types (including HTML)
  if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
    return new Blob([String.fromCharCode(0xfeff), blob].flat(), { type: blob.type });
  }
  return blob;
};

const click = (node) => {
  try {
    node.dispatchEvent(new MouseEvent("click"));
  } catch (e) {
    if (typeof root !== "undefined") {
      const evt = document.createEvent("MouseEvents");
      evt.initMouseEvent(
        "click",
        true,
        true,
        root as unknown as Window,
        0,
        0,
        0,
        100,
        80,
        false,
        false,
        false,
        false,
        0,
        null,
      );
      node.dispatchEvent(evt);
    }
  }
};
interface DownloadOptions {
  filename: string;
  mime?: string;
  bom?: BlobPart;
  unicodeBom?: boolean;
  useDataUrl?: false;
}
interface DataUrlDownloadOptions {
  filename: string;
  mime: string;
  bom?: BlobPart;
  unicodeBom?: boolean;
  useDataUrl: true;
}
// Chrome will not allow more than 6 concurrent downloads
// This won't do _much_ because we won't know if the download is actually complete, but it should somewhat solve the
// problem of the function being called in a loop 100 times or so.
const CONCURRENT_DOWNLOADS = 6;
const limit = pLimit(CONCURRENT_DOWNLOADS);
const isWebView =
  root?.navigator &&
  /Macintosh/.test(navigator.userAgent) &&
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Safari/.test(navigator.userAgent);
const isSafari = root?.HTMLElement && (/constructor/i.test(root.HTMLElement as unknown as string) || root.safari);
const isChromeIOS = root?.navigator && /CriOS\/[\d]+/.test(root.navigator.userAgent);

const createLinkAndDownloadUrl = (url: string, filename: string) => {
  const downloadLink = document.createElementNS("http://www.w3.org/1999/xhtml", "a") as HTMLAnchorElement;
  downloadLink.style.display = "none";
  downloadLink.href = url;
  downloadLink.rel = "noopener noreferrer";
  downloadLink.setAttribute("download", filename);
  if (typeof downloadLink.download === "undefined") {
    downloadLink.setAttribute("target", "_blank");
  }

  document.body.appendChild(downloadLink);

  setTimeout(() => {
    click(downloadLink);
  });

  setTimeout(() => {
    document.body.removeChild(downloadLink);
  }, 1000 * 60 * 2);
};
export const download = (data: BlobPart | BlobPart[], options: DownloadOptions | DataUrlDownloadOptions) => {
  const { filename = "file.txt", mime, bom, useDataUrl, unicodeBom } = options || {};
  limit(() => {
    return new Promise<void>(async (resolve) => {
      if (typeof root === "undefined") {
        resolve();
        return;
      }

      // it doesn't matter if data is a promise or not, it will resolve, if someone messes up and passes in a promise
      const resolved = Promise.resolve(data);
      const resolvedData = await resolved;
      const blobData = (
        typeof bom !== "undefined"
          ? [bom, resolvedData]
          : [unicodeBom ? attemptToAddUnicodeBOM(resolvedData) : resolvedData]
      ).flat();

      let url;
      let isDataUrl = useDataUrl || typeof Blob === "undefined";
      if (isDataUrl) {
        const dataStr = blobData.map((item) => (typeof item === "string" ? item : item.toString())).join("");
        url = `data:${mime || "application/octet-stream"},${encodeURIComponent(bom ? bom + dataStr : dataStr)}`;
      } else {
        const blob = new Blob(blobData, { type: mime || "application/octet-stream" });
        const isBinary = [mime, blob.type].includes("application/octet-stream");
        if ((isChromeIOS || (isBinary && isSafari) || isWebView) && typeof FileReader !== "undefined") {
          // Safari doesn't allow downloading of blob URLs
          const reader = new FileReader();
          reader.onloadend = () => {
            let url = reader.result?.toString() || "";
            url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, "data:attachment/file;");
            createLinkAndDownloadUrl(url, filename);
            setTimeout(() => {
              resolve();
            }, 300);
          };
          reader.readAsDataURL(blob);
          return;
        } else {
          if (typeof root.navigator.msSaveBlob !== "undefined") {
            root.navigator.msSaveBlob(blob, filename);
            resolve();
            return;
          }
          url = (root.URL || root.webkitURL).createObjectURL(blob);
        }
      }

      createLinkAndDownloadUrl(url, filename);

      // resolve after 300ms
      setTimeout(() => {
        resolve();
      }, 300);
      // revoke the object url after 4 minutes

      if (!isDataUrl) {
        setTimeout(() => {
          root.URL?.revokeObjectURL(url);
        }, 1000 * 60 * 2);
      }
    });
  });
};
export default download;
