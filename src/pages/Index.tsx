import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, Globe, Trash2, Lock, ArrowRight, CheckCircle, LayoutDashboard, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">FixSense</span>
        </div>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : user ? (
          <Link to="/dashboard">
            <Button>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        ) : (
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Take control of your{' '}
            <span className="gradient-text">digital footprint</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Discover every website and service linked to your email. 
            Request account deletion. Revoke access. Regain control.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="gap-2">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <p className="text-sm text-muted-foreground">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-8 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <Globe className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Discover Accounts</h3>
            <p className="mt-2 text-muted-foreground">
              Connect your Gmail to automatically find every service you've signed up for. 
              See your full digital footprint in one place.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-8 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold">Request Deletion</h3>
            <p className="mt-2 text-muted-foreground">
              One-click deletion requests for any account. Track the status of your 
              requests and take back your data.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-8 transition-shadow hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <Lock className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-xl font-semibold">Privacy First</h3>
            <p className="mt-2 text-muted-foreground">
              Read-only access. No passwords stored. Your data is encrypted 
              and never shared with third parties.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Built for trust</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>No passwords stored</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>Read-only email access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>End-to-end encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>GDPR compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>FixSense</span>
          </div>
          <p>© {new Date().getFullYear()} FixSense. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
