export interface MysteryBookMood {
  tag: string;
  label: string;
  emoji: string;
}

export const MYSTERY_BOOK_MOODS: MysteryBookMood[] = [
  { tag: 'cozy', label: 'Cozy', emoji: '🧣' },
  { tag: 'dark', label: 'Dark', emoji: '🌑' },
  { tag: 'adventurous', label: 'Adventurous', emoji: '🗺️' },
  { tag: 'romantic', label: 'Romantic', emoji: '💕' },
  { tag: 'funny', label: 'Funny', emoji: '😂' },
  { tag: 'emotional', label: 'Emotional', emoji: '🥺' },
  { tag: 'thought-provoking', label: 'Thought-Provoking', emoji: '🧠' },
  { tag: 'mysterious', label: 'Mysterious', emoji: '🔮' },
  { tag: 'inspiring', label: 'Inspiring', emoji: '✨' },
  { tag: 'spooky', label: 'Spooky', emoji: '👻' },
  { tag: 'heartwarming', label: 'Heartwarming', emoji: '🫶' },
  { tag: 'mind-bending', label: 'Mind-Bending', emoji: '🌀' },
  { tag: 'epic', label: 'Epic', emoji: '⚔️' },
  { tag: 'quiet', label: 'Quiet', emoji: '🍃' },
];

export const REACTION_EMOJIS = ['😍', '🤩', '😮', '🤔', '😅', '💀', '🔥', '❤️'];
