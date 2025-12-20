
# Security Configuration & Best Practices

## ⚠️ Action Required: Enable Leaked Password Protection

You have received a warning that "Leaked password protection is currently disabled". Since this project does not use a local `supabase/config.toml` for Auth settings, you must enable this in the Supabase Dashboard.

### Remediation Steps
1. Go to your **Supabase Dashboard** > **Authentication** > **Providers**.
2. Assuming you are using **Email/Password**:
   - Click on **Phone** (or check under Authentication settings directly, depending on dashboard version).
   - Actually, look for **Authentication** > **Configuration** > **Security** (or generic **Hooks** depending on version).
   - **Correct Path:** **Authentication** > **Policies** (or **Security** tab).
   - Look for the toggle: **Enable Leaked Password Protection**.
   - **Turn it ON**.

*Note: This feature checks new password submissions against the HaveIBeenPwned database.*

## Other Standard Security Checks
- [ ] **Row Level Security (RLS):** Ensure all tables in `supabase/schema.sql` have `alter table x enable row level security;`.
- [ ] **Service Role Key:** Never commit `SUPABASE_SERVICE_ROLE_KEY` to git.
- [ ] **MFA:** Consider enabling Multi-Factor Authentication for the organization owners.
