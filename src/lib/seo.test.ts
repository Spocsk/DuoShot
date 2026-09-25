import { describe, expect, it, vi } from "vitest";
import { localizedPath, MARKETING_ROUTE_PAIRS } from "./site";
import { pageMetadata } from "./seo";
import { jsonLdGraph } from "./json-ld";
import robots from "@/app/robots";

describe("public routes and crawler metadata",()=>{
 it("maps final localized routes reciprocally",()=>{for(const route of MARKETING_ROUTE_PAIRS){expect(localizedPath("en",route.fr)).toBe(route.en);expect(localizedPath("fr",route.en)).toBe(route.fr);} expect(localizedPath("en","/en/rejet")).toBe("/en/rejection");});
 it("puts noindex on each private route in both languages",()=>{for(const path of ["/tool","/account","/login","/signup","/invite/token","/r/id"]){for(const locale of ["fr","en"] as const){expect(pageMetadata({locale,path,title:"test",description:"test"}).robots).toEqual({index:false,follow:false});}}});
 it("lets crawlers read private page noindex and uses one bot policy",()=>{expect(robots().rules).toEqual([{userAgent:"*",allow:"/",disallow:["/api/","/auth/"]}]);});
 it("includes annual and monthly prices in structured offers",()=>{const app=jsonLdGraph("en")["@graph"][1]; expect(app.offers?.map(o=>o.price)).toEqual(["0","12","49","120","490"]);});
 it("puts the product name first in both home titles and uses the final domain",()=>{vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://duoshot.site"); try {for(const locale of ["fr","en"] as const){const metadata=pageMetadata({locale,path:"/",title:locale==="fr"?"captures iPhone Duo pour l’App Store":"iPhone Duo screenshots for the App Store",description:"DuoShot"}); expect(metadata.title).toEqual({absolute:expect.stringMatching(/^DuoShot — /)}); expect(metadata.alternates?.canonical).toBe(`https://duoshot.site${locale==="fr"?"/":"/en"}`);}} finally {vi.unstubAllEnvs();}});
});
