export type AccessMap = Record<string, boolean | undefined>;

export type FirstAccessDestination =
  | "/dashboard"
  | "/customers"
  | "/appointments"
  | "/services"
  | "/staffs"
  | "/service-tracking"
  | "/payments"
  | "/inventory"
  | null;

/*
 * Keep this order synchronized with the sidebar NAV_ITEMS order.
 *
 * The first item the user is allowed to access becomes the authenticated
 * landing page after login and when the root "/" route is visited.
 */
export const AUTHENTICATED_MODULE_ROUTES: ReadonlyArray<{
  path: Exclude<FirstAccessDestination, null>;
  module: string;
}> = [
  {
    path: "/dashboard",
    module: "dashboard",
  },
  {
    path: "/customers",
    module: "customers",
  },
  {
    path: "/appointments",
    module: "appointments",
  },
  {
    path: "/services",
    module: "services",
  },
  {
    path: "/staffs",
    module: "staffs",
  },
  {
    path: "/service-tracking",
    module: "serviceTracking",
  },
  {
    path: "/payments",
    module: "payments",
  },
  {
    path: "/inventory",
    module: "inventory",
  },
];

/**
 * Returns the first sidebar module enabled for the authenticated user.
 */
export function getFirstAccessibleRoute(
  access: AccessMap | null | undefined,
): FirstAccessDestination {
  if (!access) {
    return null;
  }

  const firstAllowed =
    AUTHENTICATED_MODULE_ROUTES.find(
      (item) => access[item.module] === true,
    );

  return firstAllowed?.path ?? null;
}
