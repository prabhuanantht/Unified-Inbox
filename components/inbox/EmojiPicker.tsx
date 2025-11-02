'use client';

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMOJI_CATEGORIES = [
  { name: 'Recently Used', emojis: ['😀', '😂', '❤️', '👍', '🔥', '🎉', '💯', '😊'] },
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'] },
  { name: 'People', emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤞', '✌️', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'] },
  { name: 'Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊'] },
  { name: 'Food', emojis: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒'] },
  { name: 'Activities', emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋'] },
  { name: 'Objects', emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥'] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onSelect, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
        type="button"
      >
        <Smile className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-80 h-96 flex flex-col">
            {/* Category tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {EMOJI_CATEGORIES.map((category, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCategory(idx)}
                  className={cn(
                    'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition',
                    activeCategory === idx
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelect(emoji);
                      setIsOpen(false);
                    }}
                    className="text-2xl hover:bg-gray-100 rounded-lg p-2 transition hover:scale-110"
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

