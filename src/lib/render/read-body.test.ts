import { expect,it } from "vitest";
import { readRenderBody } from "./read-body";
it("rejects oversized streamed JSON before parsing without trusting Content-Length",async()=>{
 const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(40_000));c.enqueue(new Uint8Array(40_000));c.close();}});
 const request=new Request("http://localhost",{method:"POST",body,duplex:"half"} as RequestInit);
 await expect(readRenderBody(request)).rejects.toThrow("INPUT_TOO_LARGE");
});
