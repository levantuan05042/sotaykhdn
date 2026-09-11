import { useContext, useRef } from 'react';
import {
  useOutlet,
  useLocation,
  UNSAFE_LocationContext,
  UNSAFE_RouteContext,
} from 'react-router-dom';

const DETAIL_RE = /\/view\/product-detail\//;

export function ViewKeepAliveOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const locationCtx = useContext(UNSAFE_LocationContext);
  const routeCtx = useContext(UNSAFE_RouteContext);
  const isDetail = DETAIL_RE.test(location.pathname);

  const frozenRef = useRef<{
    locationCtx: typeof locationCtx;
    routeCtx: typeof routeCtx;
    node: ReturnType<typeof useOutlet>;
  } | null>(null);

  if (!isDetail) {
    frozenRef.current = { locationCtx, routeCtx, node: outlet };
  }

  const frozen = frozenRef.current;

  return (
    <>
      {frozen?.node != null && (
        <div hidden={isDetail} aria-hidden={isDetail}>
          <UNSAFE_LocationContext.Provider
            value={isDetail ? frozen.locationCtx : locationCtx}
          >
            <UNSAFE_RouteContext.Provider
              value={isDetail ? frozen.routeCtx : routeCtx}
            >
              {frozen.node}
            </UNSAFE_RouteContext.Provider>
          </UNSAFE_LocationContext.Provider>
        </div>
      )}
      {isDetail ? outlet : null}
    </>
  );
}
