-- Oye AI: Auto-Provisioning Database Trigger
-- Description: Natively intercepts signups in 'auth.users' and provisions public Profiles, 
--              default Organizations (Workspaces), and Membership records atomically.

-- 1. Create the handler function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    org_name TEXT;
    org_slug TEXT;
    user_name TEXT;
BEGIN
    -- Extract full name from metadata, or fallback to email username prefix
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1));
    
    -- A. Provision public.profiles
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;

    -- B. Generate default Organization Workspace Name and Slug
    org_name := user_name || ' Workspace';
    org_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
    
    -- De-duplicate slug if workspace conflict exists
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = org_slug) THEN
        org_slug := org_slug || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 4);
    END IF;

    -- C. Provision default public.organizations (Workspace)
    INSERT INTO public.organizations (name, slug, status, settings)
    VALUES (org_name, org_slug, 'active', '{}'::jsonb)
    RETURNING id INTO new_org_id;

    -- D. Provision public.memberships (Assign new user as owner)
    INSERT INTO public.memberships (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to auth.users table
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
