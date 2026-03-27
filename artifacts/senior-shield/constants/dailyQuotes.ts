export interface DailyQuote {
  text: string;
  author: string;
}

const DAILY_QUOTES: DailyQuote[] = [
  { text: "If you are going through hell, keep going.", author: "Winston Churchill" },
  { text: "To fall seven times, to get up eight — life starts from now.", author: "Japanese Proverb" },
  { text: "Every strike brings me closer to the next home run.", author: "Babe Ruth" },
  { text: "You may not be sure whether the storm is really over. But you won't be the same person who walked in.", author: "Haruki Murakami" },
  { text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" },
  { text: "Why not go out on a limb? That's where the fruit is.", author: "Mark Twain" },
  { text: "Setting goals is the first step in turning the invisible into the visible.", author: "Tony Robbins" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Nothing in the world can take the place of perseverance. Talent will not. Genius will not. Education will not.", author: "Calvin Coolidge" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "If I had eight hours to chop down a tree, I'd spend six hours sharpening my ax.", author: "Abraham Lincoln" },
  { text: "The happiness of your life depends on the quality of your thoughts.", author: "Marcus Aurelius" },
  { text: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem" },
  { text: "Once you replace negative thoughts with positive ones, you'll start having positive results.", author: "Willie Nelson" },
  { text: "Don't let a bad day make you think that you have a bad life.", author: "Unknown" },
  { text: "Only I can change my life. No one can do it for me.", author: "Carol Burnett" },
  { text: "The healer you have been looking for is your own courage to know and love yourself completely.", author: "Yung Pueblo" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "Life is about making an impact, not making an income.", author: "Kevin Kruse" },
  { text: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
];

export function getDailyQuote(): DailyQuote {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

export default DAILY_QUOTES;
