import axios from 'axios';

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  imageUrl?: string;
}

export interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  forecast?: WeatherForecast[];
}

export interface WeatherForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  description: string;
  icon: string;
}

export interface JokeData {
  setup?: string;
  delivery?: string;
  joke?: string;
  category: string;
}

export interface TriviaQuestion {
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  category: string;
  difficulty: string;
}

export interface HistoryFact {
  year: string;
  text: string;
  source?: string;
}

export interface QuoteData {
  content: string;
  author: string;
}

export class FreeAPIsService {
  private newsApiKey: string;
  private weatherApiKey: string;

  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY || '';
    this.weatherApiKey = process.env.WEATHER_API_KEY || '';
  }

  async getTopNews(category: string = 'general', country: string = 'us', count: number = 5): Promise<NewsArticle[]> {
    if (!this.newsApiKey) {
      return this.getFallbackNews();
    }
    try {
      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: { country, category, pageSize: count, apiKey: this.newsApiKey },
        timeout: 5000,
      });
      return (response.data.articles || []).map((a: any) => ({
        title: a.title || '',
        description: a.description || '',
        source: a.source?.name || 'Unknown',
        url: a.url || '',
        publishedAt: a.publishedAt || '',
        imageUrl: a.urlToImage || undefined,
      }));
    } catch (error: any) {
      console.error('News API error:', error?.message);
      return this.getFallbackNews();
    }
  }

  async searchNews(query: string, count: number = 5): Promise<NewsArticle[]> {
    if (!this.newsApiKey) {
      return this.getFallbackNews();
    }
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: { q: query, pageSize: count, sortBy: 'publishedAt', language: 'en', apiKey: this.newsApiKey },
        timeout: 5000,
      });
      return (response.data.articles || []).map((a: any) => ({
        title: a.title || '',
        description: a.description || '',
        source: a.source?.name || 'Unknown',
        url: a.url || '',
        publishedAt: a.publishedAt || '',
        imageUrl: a.urlToImage || undefined,
      }));
    } catch (error: any) {
      console.error('News search error:', error?.message);
      return [];
    }
  }

  async getWeather(city: string): Promise<WeatherData | null> {
    if (!this.weatherApiKey) {
      return this.getFallbackWeather(city);
    }
    try {
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { q: city, appid: this.weatherApiKey, units: 'imperial' },
        timeout: 5000,
      });
      const d = response.data;
      return {
        location: `${d.name}, ${d.sys?.country || ''}`,
        temperature: Math.round(d.main.temp),
        feelsLike: Math.round(d.main.feels_like),
        description: d.weather?.[0]?.description || 'Unknown',
        humidity: d.main.humidity,
        windSpeed: Math.round(d.wind?.speed || 0),
        icon: d.weather?.[0]?.icon || '',
      };
    } catch (error: any) {
      console.error('Weather API error:', error?.message);
      return this.getFallbackWeather(city);
    }
  }

  async getWeatherForecast(city: string): Promise<WeatherData | null> {
    if (!this.weatherApiKey) {
      return this.getFallbackWeather(city);
    }
    try {
      const [currentRes, forecastRes] = await Promise.all([
        axios.get('https://api.openweathermap.org/data/2.5/weather', {
          params: { q: city, appid: this.weatherApiKey, units: 'imperial' },
          timeout: 5000,
        }),
        axios.get('https://api.openweathermap.org/data/2.5/forecast', {
          params: { q: city, appid: this.weatherApiKey, units: 'imperial' },
          timeout: 5000,
        }),
      ]);

      const d = currentRes.data;
      const dailyMap = new Map<string, any>();
      for (const item of forecastRes.data.list || []) {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { temps: [], descriptions: [], icons: [] });
        }
        const day = dailyMap.get(date)!;
        day.temps.push(item.main.temp);
        day.descriptions.push(item.weather?.[0]?.description || '');
        day.icons.push(item.weather?.[0]?.icon || '');
      }

      const forecast: WeatherForecast[] = [];
      for (const [date, data] of dailyMap) {
        if (forecast.length >= 5) break;
        forecast.push({
          date,
          tempHigh: Math.round(Math.max(...data.temps)),
          tempLow: Math.round(Math.min(...data.temps)),
          description: data.descriptions[Math.floor(data.descriptions.length / 2)],
          icon: data.icons[Math.floor(data.icons.length / 2)],
        });
      }

      return {
        location: `${d.name}, ${d.sys?.country || ''}`,
        temperature: Math.round(d.main.temp),
        feelsLike: Math.round(d.main.feels_like),
        description: d.weather?.[0]?.description || 'Unknown',
        humidity: d.main.humidity,
        windSpeed: Math.round(d.wind?.speed || 0),
        icon: d.weather?.[0]?.icon || '',
        forecast,
      };
    } catch (error: any) {
      console.error('Weather forecast error:', error?.message);
      return this.getFallbackWeather(city);
    }
  }

  async getJoke(category: string = 'Any'): Promise<JokeData | null> {
    try {
      const safeCats = ['Misc', 'Pun', 'Programming'];
      const cat = safeCats.includes(category) ? category : 'Pun';
      const response = await axios.get(`https://v2.jokeapi.dev/joke/${cat}`, {
        params: { blacklistFlags: 'nsfw,religious,political,racist,sexist,explicit', type: 'twopart,single' },
        timeout: 5000,
      });
      const d = response.data;
      if (d.type === 'twopart') {
        return { setup: d.setup, delivery: d.delivery, category: d.category };
      }
      return { joke: d.joke, category: d.category };
    } catch (error: any) {
      console.error('Joke API error:', error?.message);
      return { joke: "Why don't scientists trust atoms? Because they make up everything!", category: 'Pun' };
    }
  }

  async getTrivia(amount: number = 5, difficulty: string = 'easy'): Promise<TriviaQuestion[]> {
    try {
      const response = await axios.get('https://opentdb.com/api.php', {
        params: { amount, difficulty, type: 'multiple' },
        timeout: 5000,
      });
      return (response.data.results || []).map((q: any) => ({
        question: this.decodeHtml(q.question),
        correctAnswer: this.decodeHtml(q.correct_answer),
        incorrectAnswers: q.incorrect_answers.map((a: string) => this.decodeHtml(a)),
        category: q.category,
        difficulty: q.difficulty,
      }));
    } catch (error: any) {
      console.error('Trivia API error:', error?.message);
      return [];
    }
  }

  async getHistoryFact(month?: number, day?: number): Promise<HistoryFact[]> {
    try {
      const now = new Date();
      const m = month || now.getMonth() + 1;
      const d = day || now.getDate();
      const response = await axios.get(`https://byabbe.se/on-this-day/${m}/${d}/events.json`, {
        timeout: 5000,
      });
      const events = response.data.events || [];
      return events.slice(0, 5).map((e: any) => ({
        year: e.year || '',
        text: e.description || '',
        source: e.wikipedia?.[0]?.wikipedia || undefined,
      }));
    } catch (error: any) {
      console.error('History API error:', error?.message);
      return [{ year: '1969', text: 'Neil Armstrong became the first human to walk on the Moon.' }];
    }
  }

  async getQuote(): Promise<QuoteData | null> {
    try {
      const response = await axios.get('https://zenquotes.io/api/random', { timeout: 5000 });
      const d = response.data?.[0];
      if (d) {
        return { content: d.q, author: d.a };
      }
      return this.getFallbackQuote();
    } catch (error: any) {
      console.error('Quote API error:', error?.message);
      return this.getFallbackQuote();
    }
  }

  async getDailyDigest(city: string = 'New York'): Promise<{
    weather: WeatherData | null;
    news: NewsArticle[];
    history: HistoryFact[];
    quote: QuoteData | null;
    joke: JokeData | null;
  }> {
    const [weather, news, history, quote, joke] = await Promise.all([
      this.getWeather(city).catch(() => null),
      this.getTopNews('general', 'us', 3).catch(() => []),
      this.getHistoryFact().catch(() => []),
      this.getQuote().catch(() => null),
      this.getJoke('Pun').catch(() => null),
    ]);
    return { weather, news, history, quote, joke };
  }

  getServiceStatus(): {
    newsApi: { configured: boolean; key: string };
    weatherApi: { configured: boolean; key: string };
    freeApis: string[];
  } {
    return {
      newsApi: {
        configured: !!this.newsApiKey,
        key: this.newsApiKey ? '***configured***' : 'NOT SET',
      },
      weatherApi: {
        configured: !!this.weatherApiKey,
        key: this.weatherApiKey ? '***configured***' : 'NOT SET',
      },
      freeApis: ['JokeAPI (no key)', 'Open Trivia DB (no key)', 'On This Day (no key)', 'ZenQuotes (no key)'],
    };
  }

  private decodeHtml(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&ntilde;/g, 'ñ')
      .replace(/&eacute;/g, 'é');
  }

  private getFallbackNews(): NewsArticle[] {
    return [{
      title: 'News API not configured',
      description: 'Set NEWS_API_KEY in your environment to get live news headlines.',
      source: 'System',
      url: '',
      publishedAt: new Date().toISOString(),
    }];
  }

  private getFallbackWeather(city: string): WeatherData {
    return {
      location: city,
      temperature: 0,
      feelsLike: 0,
      description: 'Weather API not configured. Set WEATHER_API_KEY in your environment.',
      humidity: 0,
      windSpeed: 0,
      icon: '',
    };
  }

  private getFallbackQuote(): QuoteData {
    const quotes = [
      { content: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
      { content: 'You are never too old to set another goal or to dream a new dream.', author: 'C.S. Lewis' },
      { content: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}
