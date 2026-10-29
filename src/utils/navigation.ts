import type { Href, useRouter } from 'expo-router';

/** Go back, or to `fallback` when there is no history (deep link, web reload). */
export function goBack(router: ReturnType<typeof useRouter>, fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
