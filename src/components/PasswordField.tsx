import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  autoComplete?: string;
  id?: string;
};

export function PasswordField({ value, onChange, placeholder, ariaLabel, autoComplete = 'current-password', id }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        aria-label={ariaLabel}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow(!show)}
        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </Button>
    </div>
  );
}
