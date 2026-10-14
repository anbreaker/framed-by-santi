import { ActivatedRouteSnapshot, ViewTransitionInfo } from '@angular/router';

function deepestChild(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  let current = snapshot;
  while (current.firstChild) current = current.firstChild;

  return current;
}

/** True when only query parameters or the fragment changed, such as picking a gallery filter. */
export function isSamePageNavigation(
  from: ActivatedRouteSnapshot,
  to: ActivatedRouteSnapshot
): boolean {
  const origin = deepestChild(from);
  const destination = deepestChild(to);

  return (
    origin.routeConfig === destination.routeConfig &&
    JSON.stringify(origin.params) === JSON.stringify(destination.params)
  );
}

/** Page transitions are for moving between pages; in-page changes should stay instant. */
export const skipSamePageTransitions = ({ from, to, transition }: ViewTransitionInfo): void => {
  if (isSamePageNavigation(from, to)) transition.skipTransition();
};
