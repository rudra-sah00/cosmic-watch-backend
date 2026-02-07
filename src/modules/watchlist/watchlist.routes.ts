import { Router } from 'express';
import { authenticate, validate } from '../../middlewares';
import { WatchlistController } from './watchlist.controller';
import { addWatchlistSchema } from './watchlist.schema';

const router = Router();

// All watchlist routes require authentication
router.use(authenticate);

router.post('/', validate(addWatchlistSchema), WatchlistController.add);
router.get('/', WatchlistController.getAll);
router.delete('/:asteroidId', WatchlistController.remove);

export default router;
