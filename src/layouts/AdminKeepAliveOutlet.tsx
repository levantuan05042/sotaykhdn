import { useContext, useLayoutEffect, useRef, type CSSProperties } from 'react';
import {
  useOutlet,
  useLocation,
  UNSAFE_LocationContext,
  UNSAFE_RouteContext,
} from 'react-router-dom';

const LIST_PATHS = new Set([
  '/product-groups',
  '/product-category',
  '/business-management',
  '/criteria-management',
  '/products/official',
  '/products/processing',
  '/products/rejected',
  '/products/requests',
  '/request-list',
  '/product-approval-list',
  '/approver/request-list',
  '/approver/product-groups',
  '/approver/product-category',
  '/approver/products/single',
  '/approver/business',
  '/approver/criteria',
]);

const DETAIL_PATTERNS = [
  /^\/product-groups\/(?!add$)[^/]+$/,
  /^\/product-category\/(?!add$)[^/]+$/,
  /^\/business-management\/(?!add$)[^/]+$/,
  /^\/criteria-management\/(?!add$)[^/]+$/,
  /^\/products\/batch\/[^/]+$/,
  /^\/products\/(?!official$|processing$|rejected$|requests$|add$|batch$)[^/]+$/,
  /^\/product\/[^/]+$/,
  /^\/approver\/product-groups\/[^/]+$/,
  /^\/approver\/product-category\/[^/]+$/,
  /^\/approver\/products\/single\/[^/]+$/,
  /^\/approver\/business\/[^/]+$/,
  /^\/approver\/criteria\/[^/]+$/,
  /^\/approver\/batch\/[^/]+$/,
  /^\/approver\/product-detail\/[^/]+$/,
];

const isListPath = (pathname: string) => LIST_PATHS.has(pathname);
const isDetailPath = (pathname: string) => DETAIL_PATTERNS.some((re) => re.test(pathname));

const tableScrollByPath = new Map<string, number>();

function readTableScroll(root: HTMLElement | null) {
  const table = root?.querySelector('.data-table-container') as HTMLElement | null;
  return table?.scrollTop ?? 0;
}

function writeTableScroll(root: HTMLElement | null, top: number) {
  const table = root?.querySelector('.data-table-container') as HTMLElement | null;
  if (table) table.scrollTop = top;
}

export function AdminKeepAliveOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const locationCtx = useContext(UNSAFE_LocationContext);
  const routeCtx = useContext(UNSAFE_RouteContext);
  const pathname = location.pathname;
  const isDetail = isDetailPath(pathname);
  const isList = isListPath(pathname);

  const listWrapRef = useRef<HTMLDivElement>(null);
  const frozenRef = useRef<{
    locationCtx: typeof locationCtx;
    routeCtx: typeof routeCtx;
    node: ReturnType<typeof useOutlet>;
    pathname: string;
  } | null>(null);

  if (isList) {
    const prev = frozenRef.current;
    if (!prev || prev.pathname !== pathname) {
      frozenRef.current = { locationCtx, routeCtx, node: outlet, pathname };
    } else {
      frozenRef.current = { ...prev, locationCtx, routeCtx };
    }
  } else if (!isDetail) {
    frozenRef.current = null;
  }

  const frozen = frozenRef.current;
  const hideList = isDetail && frozen != null;

  useLayoutEffect(() => {
    const root = listWrapRef.current;
    if (!root || !frozen || hideList) return;
    writeTableScroll(root, tableScrollByPath.get(frozen.pathname) ?? 0);
  }, [hideList, frozen?.pathname]);

  useLayoutEffect(() => {
    const root = listWrapRef.current;
    if (!root || hideList || !frozen) return;

    const snapshot = () => {
      tableScrollByPath.set(frozen.pathname, readTableScroll(root));
    };
    const table = root.querySelector('.data-table-container');
    table?.addEventListener('scroll', snapshot, { passive: true });
    root.addEventListener('pointerdown', snapshot, true);
    return () => {
      table?.removeEventListener('scroll', snapshot);
      root.removeEventListener('pointerdown', snapshot, true);
    };
  }, [hideList, frozen?.pathname]);

  const hiddenStyle: CSSProperties | undefined = hideList
    ? { display: 'none' }
    : { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 };

  return (
    <>
      {frozen?.node != null && (
        <div
          ref={listWrapRef}
          hidden={hideList}
          aria-hidden={hideList}
          style={hiddenStyle}
        >
          <UNSAFE_LocationContext.Provider value={hideList ? frozen.locationCtx : locationCtx}>
            <UNSAFE_RouteContext.Provider value={hideList ? frozen.routeCtx : routeCtx}>
              {frozen.node}
            </UNSAFE_RouteContext.Provider>
          </UNSAFE_LocationContext.Provider>
        </div>
      )}
      {isDetail || !isList ? outlet : null}
    </>
  );
}
