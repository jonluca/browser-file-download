# Browser File Download

Download files with javascript

```javascript
import axios from "axios";
import { download } from "browser-file-download";

const download = async (url: string, filename: string) => {
  const { data } = await axios.get(url, {
    responseType: "blob",
  });
  download(data, { filename });
};
```

## Options

```typescript
interface DownloadOptions {
  filename: string; // filename
  mime?: string; // mime time (default: application/octet-stream) - required when using useDataUrl
  bom?: BlobPart; // bom (bytes to include at the start of the file)
  useDataUrl?: boolean; // whether to use the legacy data url instead of a blob url
}
```

## Examples

#### CSV

If your CSVs are looking weird, you can try

```typescript
import { download } from "browser-file-download";

let csvString = "";
const bom = "\uFEFF";

download(csvString, { filename: "data.csv", bom, useDataUrl: true, mime: "text/csv; charset=utf-8" });
```
