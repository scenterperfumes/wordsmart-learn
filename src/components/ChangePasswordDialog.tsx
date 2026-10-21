import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/PasswordField';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [cf, setCf] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (nw.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    if (nw !== cf) { toast.error('New passwords do not match.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: nw, current_password: cur });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password changed. Use your new password next time you sign in.');
    setCur(''); setNw(''); setCf('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Change password</DialogTitle>
          <DialogDescription>Set a new password for this account.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <PasswordField ariaLabel="Current password" autoComplete="current-password" placeholder="Current password" value={cur} onChange={setCur} />
          <PasswordField ariaLabel="New password" autoComplete="new-password" placeholder="New password (min 6 characters)" value={nw} onChange={setNw} />
          <PasswordField ariaLabel="Retype new password" autoComplete="new-password" placeholder="Retype new password" value={cf} onChange={setCf} />
          <Button disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save new password'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
