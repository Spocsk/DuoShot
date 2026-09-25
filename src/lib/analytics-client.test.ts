import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const sdk=vi.hoisted(()=>({init:vi.fn(),opt_in_tracking:vi.fn(),opt_out_tracking:vi.fn(),track:vi.fn(),identify:vi.fn(),reset:vi.fn(),people:{set:vi.fn()}}));
vi.mock("mixpanel-browser",()=>({default:sdk}));
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN","test-project");const values=new Map<string,string>();vi.stubGlobal("window",{localStorage:{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)},dispatchEvent:vi.fn()});});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe("analytics consent",()=>{
 it("does not initialize or send anything before consent",async()=>{const a=await import("./analytics-client");await a.trackProduct("page_viewed");expect(sdk.init).not.toHaveBeenCalled();expect(sdk.track).not.toHaveBeenCalled();});
 it("keeps refusal effective and stops tracking after withdrawal",async()=>{const a=await import("./analytics-client");await a.setAnalyticsChoice("rejected");await a.trackProduct("page_viewed");expect(sdk.track).not.toHaveBeenCalled();await a.setAnalyticsChoice("accepted");await a.trackProduct("captures_added");expect(sdk.init).toHaveBeenCalledWith("test-project",expect.objectContaining({api_host:"https://api-eu.mixpanel.com",autocapture:false,record_sessions_percent:0,ip:false}));expect(sdk.track).toHaveBeenCalledTimes(1);await a.setAnalyticsChoice("rejected");await a.trackProduct("page_viewed");expect(sdk.track).toHaveBeenCalledTimes(1);expect(sdk.opt_out_tracking).toHaveBeenCalled();});
});
