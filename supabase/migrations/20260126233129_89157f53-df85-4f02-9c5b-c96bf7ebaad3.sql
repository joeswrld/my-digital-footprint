-- =============================================
-- FIXSENSE DATABASE SCHEMA
-- Privacy platform for account discovery & control
-- =============================================

-- Create enums
CREATE TYPE public.account_category AS ENUM ('social', 'finance', 'shopping', 'saas', 'other');
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.action_type AS ENUM ('deletion', 'revoke');
CREATE TYPE public.action_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- DISCOVERED ACCOUNTS TABLE
-- =============================================
CREATE TABLE public.discovered_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    service_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    category account_category DEFAULT 'other',
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE,
    risk_score risk_level DEFAULT 'low',
    source TEXT DEFAULT 'manual', -- 'manual', 'gmail_scan', 'extension'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, domain)
);

ALTER TABLE public.discovered_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
    ON public.discovered_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
    ON public.discovered_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
    ON public.discovered_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
    ON public.discovered_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- ACCOUNT ACTIONS TABLE
-- =============================================
CREATE TABLE public.account_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    discovered_account_id UUID REFERENCES public.discovered_accounts(id) ON DELETE CASCADE NOT NULL,
    action_type action_type NOT NULL,
    status action_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.account_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions"
    ON public.account_actions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own actions"
    ON public.account_actions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own actions"
    ON public.account_actions FOR UPDATE
    USING (auth.uid() = user_id);

-- =============================================
-- USER METRICS TABLE
-- =============================================
CREATE TABLE public.user_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    accounts_discovered_count INTEGER DEFAULT 0,
    actions_taken_count INTEGER DEFAULT 0,
    first_action_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    gmail_connected BOOLEAN DEFAULT FALSE,
    extension_installed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
    ON public.user_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
    ON public.user_metrics FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
    ON public.user_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Auto-create metrics on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_metrics (user_id)
    VALUES (NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- =============================================
-- OAUTH TOKENS TABLE (Encrypted storage)
-- =============================================
CREATE TABLE public.oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    provider TEXT NOT NULL DEFAULT 'gmail',
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- No direct SELECT allowed - access via edge functions only
CREATE POLICY "No direct token access"
    ON public.oauth_tokens FOR SELECT
    USING (false);

-- Users can insert via edge function (service role)
CREATE POLICY "Service role can manage tokens"
    ON public.oauth_tokens FOR ALL
    USING (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_discovered_accounts_updated_at
    BEFORE UPDATE ON public.discovered_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_account_actions_updated_at
    BEFORE UPDATE ON public.account_actions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_metrics_updated_at
    BEFORE UPDATE ON public.user_metrics
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_oauth_tokens_updated_at
    BEFORE UPDATE ON public.oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_discovered_accounts_user_id ON public.discovered_accounts(user_id);
CREATE INDEX idx_discovered_accounts_category ON public.discovered_accounts(category);
CREATE INDEX idx_discovered_accounts_domain ON public.discovered_accounts(domain);
CREATE INDEX idx_account_actions_user_id ON public.account_actions(user_id);
CREATE INDEX idx_account_actions_status ON public.account_actions(status);
CREATE INDEX idx_user_metrics_user_id ON public.user_metrics(user_id);