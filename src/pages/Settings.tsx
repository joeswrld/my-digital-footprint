import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMetrics } from '@/hooks/useMetrics';
import { useGmailConnect } from '@/hooks/useGmailConnect';
import { useTheme } from '@/components/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Shield,
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Bell,
  Eye,
  Lock,
  Loader2,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  Palette,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const ACCENT_OPTIONS = [
  { value: 'teal', label: 'Teal', color: 'bg-[hsl(173,58%,39%)]' },
  { value: 'blue', label: 'Blue', color: 'bg-[hsl(217,91%,60%)]' },
  { value: 'purple', label: 'Purple', color: 'bg-[hsl(262,83%,58%)]' },
  { value: 'rose', label: 'Rose', color: 'bg-[hsl(346,77%,50%)]' },
  { value: 'amber', label: 'Amber', color: 'bg-[hsl(38,92%,50%)]' },
] as const;

const DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compact', description: 'Tighter spacing' },
  { value: 'comfortable', label: 'Comfortable', description: 'Default spacing' },
  { value: 'spacious', label: 'Spacious', description: 'More breathing room' },
] as const;

const Settings = () => {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { metrics } = useMetrics();
  const { connectGmail, scanEmails, isConnecting, isScanning } = useGmailConnect();
  const { theme, setTheme, accentColor, setAccentColor, layoutDensity, setLayoutDensity } = useTheme();
  const queryClient = useQueryClient();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    emailNotifications: true,
    scanNewEmails: true,
    shareAnonymousData: false,
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleDisconnectGmail = async () => {
    setIsDisconnecting(true);
    try {
      const { error } = await supabase
        .from('oauth_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', 'gmail');

      if (error) throw error;

      await supabase
        .from('user_metrics')
        .update({ gmail_connected: false })
        .eq('user_id', user.id);

      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Gmail disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect Gmail');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 animate-fade-in max-w-3xl">
        {/* Header */}
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg bg-primary/10 p-2">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how FixSense looks and feels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Toggle */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme</Label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className="flex-1"
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className="flex-1"
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                    className="flex-1"
                  >
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Accent Color */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Accent Color</Label>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAccentColor(option.value)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                        accentColor === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn('h-4 w-4 rounded-full', option.color)} />
                      <span className="text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Layout Density */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Layout Density</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DENSITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLayoutDensity(option.value)}
                      className={cn(
                        'flex flex-col items-start rounded-lg border p-3 text-left transition-colors',
                        layoutDensity === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <LayoutGrid className="mb-1 h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground text-xs">Display Name</Label>
                  <p className="font-medium">{profile?.display_name || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Verified</p>
                  <p className="text-sm text-muted-foreground">Your email verification status</p>
                </div>
                {profile?.email_verified ? (
                  <Badge className="bg-success/10 text-success hover:bg-success/20">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="mr-1 h-3 w-3" />
                    Not verified
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Connected Integrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Connected Integrations
              </CardTitle>
              <CardDescription>Manage your connected services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      metrics?.gmail_connected ? 'bg-success/10' : 'bg-muted'
                    }`}
                  >
                    <Mail
                      className={`h-5 w-5 ${
                        metrics?.gmail_connected ? 'text-success' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium">Gmail</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics?.gmail_connected
                        ? 'Connected - scanning for accounts'
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                {metrics?.gmail_connected ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={scanEmails}
                      disabled={isScanning}
                    >
                      {isScanning ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isDisconnecting}>
                          {isDisconnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Disconnect'
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the Gmail connection. Your discovered accounts will
                            remain, but new accounts won't be automatically discovered.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDisconnectGmail}>
                            Disconnect
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <Button onClick={connectGmail} disabled={isConnecting} size="sm">
                    {isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Privacy Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Privacy Preferences
              </CardTitle>
              <CardDescription>Control how your data is used</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts about new discovered accounts
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={privacySettings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setPrivacySettings((prev) => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="scan-new-emails" className="font-medium">
                    Automatic Email Scanning
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Periodically scan for new service signups
                  </p>
                </div>
                <Switch
                  id="scan-new-emails"
                  checked={privacySettings.scanNewEmails}
                  onCheckedChange={(checked) =>
                    setPrivacySettings((prev) => ({ ...prev, scanNewEmails: checked }))
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="anonymous-data" className="font-medium">
                    Anonymous Usage Data
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Help improve FixSense by sharing anonymous usage statistics
                  </p>
                </div>
                <Switch
                  id="anonymous-data"
                  checked={privacySettings.shareAnonymousData}
                  onCheckedChange={(checked) =>
                    setPrivacySettings((prev) => ({ ...prev, shareAnonymousData: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">New Account Discovered</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when a new service is found
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Action Completed</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications when deletion/revocation completes
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-medium">Security Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Important security notifications about your accounts
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Data & Privacy
              </CardTitle>
              <CardDescription>Manage your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Export Your Data</p>
                  <p className="text-sm text-muted-foreground">Download all your account data</p>
                </div>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your FixSense account
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account,
                        all discovered accounts, and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card>
            <CardContent className="pt-6">
              <Button variant="outline" className="w-full" onClick={signOut}>
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
