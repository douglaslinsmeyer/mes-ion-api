import { Router, Request, Response } from 'express';
import { config } from './config/index';
import logger from './utils/logger';
import crypto from 'crypto';

export const webhookRouter = Router();

// Webhook signature verification middleware
const verifyWebhookSignature = (req: Request, res: Response, next: () => void): void => {
  if (!config.webhookSecret) {
    logger.warn('Webhook secret not configured, skipping signature verification');
    return next();
  }

  const signature = req.headers['x-webhook-signature'] as string;
  if (!signature) {
    res.status(401).json({
      error: {
        code: 'MISSING_SIGNATURE',
        message: 'Webhook signature required',
      },
    });
    return;
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', config.webhookSecret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.warn('Invalid webhook signature');
    res.status(401).json({
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Invalid webhook signature',
      },
    });
    return;
  }

  next();
};

// ION webhook endpoint
webhookRouter.post('/ion', verifyWebhookSignature, async (req, res) => {
  try {
    logger.info('Received ION webhook', {
      headers: req.headers,
      body: req.body,
    });

    // TODO: Process ION webhook events
    // - Parse BOD messages
    // - Transform data
    // - Emit events or trigger actions

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error processing ION webhook:', error);
    res.status(500).json({
      error: {
        code: 'WEBHOOK_PROCESSING_ERROR',
        message: 'Failed to process webhook',
      },
    });
  }
});