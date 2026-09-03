// Fetches a URL as a blob and triggers a real browser download under a
// chosen filename. A plain <a href download> only forces the filename for
// same-origin links, so this covers photos served from anywhere consistently.
export async function downloadFile(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not download file.");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
