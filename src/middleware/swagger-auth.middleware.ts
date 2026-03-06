import { Request, Response, NextFunction } from 'express';

export function swaggerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Docs"');
    res.status(401).send('Authentication required.');
    return;
  }

  const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64')
    .toString()
    .split(':');

  if (
    user === process.env.SWAGGER_USERNAME &&
    pass === process.env.SWAGGER_PASSWORD
  ) {
    next();
    return;
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Docs"');
  res.status(401).send('Invalid credentials.');
}
