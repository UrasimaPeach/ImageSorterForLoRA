export const escapeToHtmlText = (text) => {
  return String(text).replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll("$", "&#36;")
    .replaceAll("`", "&#96;")
}
