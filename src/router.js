export class Router {
  constructor() {
    this.routes = [];
  }
  add(method, path, handler) {
    this.routes.push({ method: method.toUpperCase(), path, handler });
  }
  #match(method, pathname) {
    method = method.toUpperCase();
    return this.routes.find((r) => {
      if (r.method !== method) return false;
      if (typeof r.path === "string") return r.path === pathname;
      if (r.path instanceof RegExp) return r.path.test(pathname);
      return false;
    });
  }
  async handle(req, env, ctx = {}) {
    const url = new URL(req.url);
    const hit = this.#match(req.method, url.pathname);
    if (!hit) return new Response("Not found", { status: 404 });
    return hit.handler(req, env, ctx);
  }
}
