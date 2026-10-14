import { ActivatedRouteSnapshot, Route, ViewTransitionInfo } from '@angular/router';

import { isSamePageNavigation, skipSamePageTransitions } from './view-transition';

const gallery: Route = { path: 'gallery' };
const viewer: Route = { path: 'gallery/:postId' };

const snapshot = (
  routeConfig: Route,
  params: Record<string, string> = {}
): ActivatedRouteSnapshot =>
  ({
    firstChild: null,
    params,
    routeConfig,
  }) as unknown as ActivatedRouteSnapshot;

const withParent = (child: ActivatedRouteSnapshot): ActivatedRouteSnapshot =>
  ({ firstChild: child, params: {}, routeConfig: null }) as unknown as ActivatedRouteSnapshot;

describe('isSamePageNavigation', () => {
  it('should treat a change that keeps the same route and params as the same page', () => {
    expect(isSamePageNavigation(withParent(snapshot(gallery)), withParent(snapshot(gallery)))).toBe(
      true
    );
  });

  it('should treat another route as a different page', () => {
    expect(
      isSamePageNavigation(
        withParent(snapshot(gallery)),
        withParent(snapshot(viewer, { postId: '1' }))
      )
    ).toBe(false);
  });

  it('should treat the same route with other params as a different page', () => {
    expect(
      isSamePageNavigation(
        withParent(snapshot(viewer, { postId: '1' })),
        withParent(snapshot(viewer, { postId: '2' }))
      )
    ).toBe(false);
  });
});

describe('skipSamePageTransitions', () => {
  const transition = (): { skipTransition: ReturnType<typeof vi.fn> } => ({
    skipTransition: vi.fn(),
  });

  it('should skip the transition for in-page navigations', () => {
    const view = transition();

    skipSamePageTransitions({
      from: snapshot(gallery),
      to: snapshot(gallery),
      transition: view,
    } as unknown as ViewTransitionInfo);

    expect(view.skipTransition).toHaveBeenCalledOnce();
  });

  it('should keep the transition when the page changes', () => {
    const view = transition();

    skipSamePageTransitions({
      from: snapshot(gallery),
      to: snapshot(viewer, { postId: '1' }),
      transition: view,
    } as unknown as ViewTransitionInfo);

    expect(view.skipTransition).not.toHaveBeenCalled();
  });
});
