'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ScheduleMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (dateTime: Date) => void;
}

export function ScheduleMessageDialog({
  open,
  onOpenChange,
  onSchedule,
}: ScheduleMessageDialogProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) {
      return;
    }

    const dateTime = new Date(`${selectedDate}T${selectedTime}`);
    
    // Validate date is in the future
    if (dateTime <= new Date()) {
      alert('Please select a future date and time');
      return;
    }

    onSchedule(dateTime);
    onOpenChange(false);
    
    // Reset form
    setSelectedDate('');
    setSelectedTime('');
  };

  // Set minimum date to today
  const minDate = format(new Date(), 'yyyy-MM-dd');
  const minTime = format(new Date(), 'HH:mm');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Schedule Message
          </DialogTitle>
          <DialogDescription>
            Choose when to send this message. The message will be sent automatically at the scheduled time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Time
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              min={selectedDate === minDate ? minTime : undefined}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          {selectedDate && selectedTime && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Message will be sent on{' '}
                <span className="font-medium text-foreground">
                  {format(new Date(`${selectedDate}T${selectedTime}`), 'PPP p')}
                </span>
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!selectedDate || !selectedTime}
          >
            Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

