import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Determine if running inside the AI Studio web preview sandbox
  const isSandbox = !!(process.env.APP_URL?.includes("run.app") || process.env.PORT === "3000");
  
  // Set the environment variable mapping for local context mapping as requested
  process.env.VITE_API_BASE_URL = '';

  const backendPort = '8050';

  // Start the Python backend first using uvicorn
  const startPythonBackend = () => {
    console.log(`Launching FastAPI backend on port ${backendPort}...`);
    
    const isProd = process.env.NODE_ENV === 'production';
    const args = ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', backendPort];
    if (!isProd) {
      args.push('--reload');
    }

    const pythonProcess = spawn('python3', args, {
      cwd: path.join(process.cwd(), 'basket-tracker/backend'),
      env: {
        ...process.env,
        PYTHONPATH: path.join(process.cwd(), 'basket-tracker/backend'),
      },
    });

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[FastAPI] ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('INFO:') || msg.includes('WARNING:')) {
        console.log(`[FastAPI] ${msg}`);
      } else {
        console.error(`[FastAPI ERROR] ${msg}`);
      }
    });

    pythonProcess.on('close', (code) => {
      console.log(`FastAPI backend exited with code ${code}`);
    });

    // Handle process termination to clean up the python backend
    const cleanup = () => {
      try {
        pythonProcess.kill();
      } catch (e) {}
    };
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  };

  startPythonBackend();

  // 2. Proxy API, Docs, and OpenAPI requests to Python backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: `http://127.0.0.1:${backendPort}`,
      changeOrigin: true,
      ws: true,
      logLevel: 'debug',
      pathRewrite: {
        '^/': '/api/',
      },
      on: {
        proxyRes: (proxyRes, req) => {
          if (proxyRes.headers.location) {
            let location = proxyRes.headers.location;
            const host = req.headers.host || 'localhost:3000';
            location = location.replace(/127\.0\.0\.1:8050/g, host);
            location = location.replace(/localhost:8050/g, host);
            proxyRes.headers.location = location;
          }
        }
      }
    })
  );

  app.use(
    '/docs',
    createProxyMiddleware({
      target: `http://127.0.0.1:${backendPort}`,
      changeOrigin: true,
      logLevel: 'debug',
      pathRewrite: {
        '^/': '/docs',
      },
      on: {
        proxyRes: (proxyRes, req) => {
          if (proxyRes.headers.location) {
            let location = proxyRes.headers.location;
            const host = req.headers.host || 'localhost:3000';
            location = location.replace(/127\.0\.0\.1:8050/g, host);
            location = location.replace(/localhost:8050/g, host);
            proxyRes.headers.location = location;
          }
        }
      }
    })
  );

  app.use(
    '/openapi.json',
    createProxyMiddleware({
      target: `http://127.0.0.1:${backendPort}`,
      changeOrigin: true,
      logLevel: 'debug',
      pathRewrite: {
        '^/': '/openapi.json',
      },
      on: {
        proxyRes: (proxyRes, req) => {
          if (proxyRes.headers.location) {
            let location = proxyRes.headers.location;
            const host = req.headers.host || 'localhost:3000';
            location = location.replace(/127\.0\.0\.1:8050/g, host);
            location = location.replace(/localhost:8050/g, host);
            proxyRes.headers.location = location;
          }
        }
      }
    })
  );

  // 3. Setup Frontend serving (Vite in dev, static files in prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
