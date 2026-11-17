/**
 * Hands the browser a file made on the device (an .ics, a .csv): no request,
 * nothing leaves the device. The object URL is released once the click has
 * been dispatched.
 */
export function downloadFile(filename: string, content: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
