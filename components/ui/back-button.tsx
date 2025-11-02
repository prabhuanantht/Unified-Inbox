'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  onClick?: () => void;
  label?: string;
  className?: string;
}

export function BackButton({ onClick, label = 'Back', className }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={cn('gap-2', className)}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Button>
  );
}

