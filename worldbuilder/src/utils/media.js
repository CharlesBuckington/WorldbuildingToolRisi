function isAbsoluteMediaSource(source) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(source);
}

export function resolveImageSource(value) {
  const source = String(value ?? "").trim();

  if (!source) {
    return "";
  }

  if (isAbsoluteMediaSource(source) || source.startsWith("/")) {
    return source;
  }

  if (source.startsWith("Img/")) {
    return `/${source}`;
  }

  return `/Img/${source.replace(/^\/+/, "")}`;
}
