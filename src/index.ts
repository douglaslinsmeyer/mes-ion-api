import { createApp } from './app.js';
import { config } from './config/index.js';
import logger from './utils/logger.js';
import { cache } from './cache/index.js';
import { IONAuthManager, initializeTokenRefresher, stopTokenRefresher } from './integrations/ion/index.js';

const startServer = async (): Promise<void> => {
  try {
    // Initialize cache
    await cache.initialize();
    
    // Initialize ION token refresher
    const authManager = new IONAuthManager();
    initializeTokenRefresher(authManager, {
      refreshBeforeExpiry: 300, // Refresh 5 minutes before expiry
      checkInterval: 60000, // Check every minute
    });
    
    const app = createApp();

    const server = app.listen(config.port, () => {
      logger.info(`🚀 MES ION API server started`, {
        port: config.port,
        environment: config.nodeEnv,
        apiPrefix: config.apiPrefix,
      });
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        try {
          // Cleanup resources
          stopTokenRefresher();
          logger.info('Token refresher stopped');
          
          await cache.disconnect();
          logger.info('Cache disconnected');
          
          logger.info('HTTP server closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

void startServer();