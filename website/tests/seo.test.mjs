import test from "node:test";
import assert from "node:assert/strict";
import {
  pageMetadata,
  seoHead,
  siteOrigin,
  sitemapXml,
  robotsTxt,
} from "../src/seo.ts";
import { renderRoute } from "../src/routes.ts";

test("unknown domain is an explicit non-indexable preview without fabricated canonical links", () => {
  assert.equal(siteOrigin(undefined), null);
  assert.equal(siteOrigin(" "), null);
  assert.match(seoHead("/", null), /noindex, follow/);
  assert.doesNotMatch(seoHead("/", null), /rel="canonical"/);
  assert.match(robotsTxt(null), /Disallow: \//);
  assert.doesNotMatch(sitemapXml(null), /<loc>/);
});
test("release metadata has absolute canonical, social image and only public sitemap routes", () => {
  const origin = siteOrigin("https://example.test/");
  assert.equal(origin, "https://example.test");
  assert.match(
    seoHead("/product", origin),
    /href="https:\/\/example.test\/product"/,
  );
  assert.match(seoHead("/product", origin), /og-ceowallet.png/);
  assert.match(seoHead("/product", origin), /index, follow/);
  assert.match(seoHead("/checkout", origin), /noindex, follow/);
  assert.match(seoHead("/missing", origin), /noindex, follow/);
  assert.equal((sitemapXml(origin).match(/<loc>/g) || []).length, 2);
  assert.doesNotMatch(sitemapXml(origin), /checkout|preview|cart/);
  for (const value of [
    "http://example.test",
    "https://example.test/path",
    "https://user:pass@example.test",
    "https://example.test/?q=1",
  ])
    assert.throws(() => siteOrigin(value));
});
test("each route is renderable without browser globals and has one H1 and a unique title", () => {
  assert.equal(
    new Set(Object.values(pageMetadata).map((page) => page.title)).size,
    Object.keys(pageMetadata).length,
  );
  for (const path of [...Object.keys(pageMetadata), "/missing"]) {
    const html = renderRoute(path);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, path);
    assert.match(html, /<main /);
  }
});
