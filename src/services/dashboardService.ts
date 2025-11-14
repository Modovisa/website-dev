// src/services/dashboardService.ts
// Compatibility shim: re-export the consolidated realtime dashboard service.
// This lets legacy imports keep working without touching the rest of the codebase.

import * as Svc from "./realtime-dashboard-service";
export default Svc;                 // supports: import svc from "@/services/dashboardService"
export * from "./realtime-dashboard-service"; // supports: import { initialize, setSite, ... } from "@/services/dashboardService"
