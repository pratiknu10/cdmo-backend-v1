export const getEffectedEntity = (url) => {
  // A regular expression to match a common pattern like /api/v1/dashboard/customers
  // and capture the last segment.
  const match = url.match(
    /\/api\/(v[0-9]+)\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/
  );
  if (match && match.length > 3) {
    // Return the third captured group, which is likely the entity name.
    return match[3];
  }
  // Fallback to a simpler regex for paths like /api/customers
  const simpleMatch = url.match(/\/api\/([a-zA-Z0-9_-]+)/);
  if (simpleMatch && simpleMatch.length > 1) {
    return simpleMatch[1];
  }
  return null; // Return null if no entity is found
};
