import { Router, Request, Response } from 'express';
import { FreeAPIsService } from '../services/SeniorShield-Free-APIs-Integration';

const router = Router();
const freeApis = new FreeAPIsService();

router.get('/health', (req: Request, res: Response) => {
  const status = freeApis.getServiceStatus();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SeniorShield Free APIs Integration',
    apis: status,
  });
});

router.get('/news', async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || 'general';
    const country = (req.query.country as string) || 'us';
    const count = parseInt(req.query.count as string) || 5;
    const articles = await freeApis.getTopNews(category, country, count);
    res.json({ articles, count: articles.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch news', message: error?.message });
  }
});

router.get('/news/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ error: 'Missing query parameter: q' });
    const count = parseInt(req.query.count as string) || 5;
    const articles = await freeApis.searchNews(query, count);
    res.json({ query, articles, count: articles.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to search news', message: error?.message });
  }
});

router.get('/weather', async (req: Request, res: Response) => {
  try {
    const city = req.query.city as string;
    if (!city) return res.status(400).json({ error: 'Missing query parameter: city' });
    const weather = await freeApis.getWeather(city);
    res.json(weather);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch weather', message: error?.message });
  }
});

router.get('/weather/forecast', async (req: Request, res: Response) => {
  try {
    const city = req.query.city as string;
    if (!city) return res.status(400).json({ error: 'Missing query parameter: city' });
    const weather = await freeApis.getWeatherForecast(city);
    res.json(weather);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch forecast', message: error?.message });
  }
});

router.get('/joke', async (req: Request, res: Response) => {
  try {
    const category = (req.query.category as string) || 'Pun';
    const joke = await freeApis.getJoke(category);
    res.json(joke);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch joke', message: error?.message });
  }
});

router.get('/trivia', async (req: Request, res: Response) => {
  try {
    const amount = parseInt(req.query.amount as string) || 5;
    const difficulty = (req.query.difficulty as string) || 'easy';
    const questions = await freeApis.getTrivia(amount, difficulty);
    res.json({ questions, count: questions.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch trivia', message: error?.message });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const day = req.query.day ? parseInt(req.query.day as string) : undefined;
    const facts = await freeApis.getHistoryFact(month, day);
    res.json({ date: `${month || new Date().getMonth() + 1}/${day || new Date().getDate()}`, facts, count: facts.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch history', message: error?.message });
  }
});

router.get('/quote', async (req: Request, res: Response) => {
  try {
    const quote = await freeApis.getQuote();
    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch quote', message: error?.message });
  }
});

router.get('/daily-digest', async (req: Request, res: Response) => {
  try {
    const city = (req.query.city as string) || 'New York';
    const digest = await freeApis.getDailyDigest(city);
    res.json({
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      ...digest,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate daily digest', message: error?.message });
  }
});

export default router;
