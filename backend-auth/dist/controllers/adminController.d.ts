import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
export declare const getAdminStats: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getConversionLogs: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getActiveUsers: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getMonthlySiteViews: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=adminController.d.ts.map