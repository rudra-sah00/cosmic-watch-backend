import { Router } from 'express';
import { authenticate } from '../../middlewares';
import { AlertController } from './alerts.controller';

const router = Router();

// All alert routes require authentication
router.use(authenticate);

router.get('/', AlertController.getAlerts);
router.get('/unread-count', AlertController.getUnreadCount);
router.patch('/read-all', AlertController.markAllAsRead);
router.patch('/:alertId/read', AlertController.markAsRead);

export default router;
