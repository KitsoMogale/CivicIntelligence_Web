import type { Instrumentation } from "next";
export const onRequestError:Instrumentation.onRequestError=(error,request,context)=>{
  console.error(JSON.stringify({event:"server_error",at:new Date().toISOString(),route:context.routePath,path:request.path.split("?")[0],method:request.method,errorType:error instanceof Error?error.name:"UnknownError",digest:typeof error==="object"&&error!==null&&"digest" in error?String(error.digest):undefined}));
};
