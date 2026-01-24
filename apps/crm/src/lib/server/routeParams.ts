export type RouteContext<T extends Record<string, string>> = {
  params?: Promise<T> | T;
};

export async function getRouteParams<T extends Record<string, string>>(ctx: RouteContext<T>): Promise<T> {
  return (await ctx.params) as T;
}
