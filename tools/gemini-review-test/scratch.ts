// Disposable file — only exists to give the new Gemini PR review workflow
// something concrete to comment on. Deliberately has a couple of obvious
// smells (magic number, no error handling) so a real review pass should
// flag something. This PR gets closed without merging once verified.
export function computeDiscount(price: number): number {
  return price * 0.15;
}

export async function fetchThing(id: string) {
  const response = await fetch("https://example.com/things/" + id);
  return response.json();
}
