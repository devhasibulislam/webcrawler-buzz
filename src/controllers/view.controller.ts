import { Request, Response } from 'express';
import path from 'path';

export const viewController = {
  home(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  },

  results(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/results.html'));
  },

  privacyPolicy(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/privacy-policy.html'));
  },

  termsOfService(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/terms-of-service.html'));
  },

  cookiePolicy(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/cookie-policy.html'));
  },
};
