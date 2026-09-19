// Server se aayi file (blob) ko browser me download karwana

const fileNameFromHeader = (header) => {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
};

export const saveBlobResponse = (response, fallbackName) => {
  const name =
    fileNameFromHeader(response.headers?.["content-disposition"]) || fallbackName;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Browser ko thoda time do phir memory free karo
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
};

// responseType "blob" me error ka JSON bhi blob ban jaata hai - usse message nikalo
export const blobErrorMessage = async (error, fallback = "Download failed") => {
  try {
    const data = error?.response?.data;
    if (data instanceof Blob) {
      const json = JSON.parse(await data.text());
      return json.message || fallback;
    }
    return data?.message || fallback;
  } catch {
    return fallback;
  }
};
