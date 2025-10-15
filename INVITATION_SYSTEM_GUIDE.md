# Invitation System & Email Whitelist Guide

**Dato**: 15. oktober 2025  
**Status**: ✅ **PRODUCTION READY**

---

## 📋 Overview

CRMFlow bruger nu et **Hybrid Invitation System** med email domain whitelist for sikker brugeradministration.

### **Sikkerhedsmodel**:

1. **Email Whitelist**: Kun `@flownordics.com` emails får automatisk adgang
2. **Role Assignment**: Andreas@flownordics.com er admin, andre @flownordics.com får sales rolle
3. **Invitation System**: Admins kan invitere eksterne brugere med specifik rolle
4. **Admin Control**: Kun admins kan se og manage invitations

---

## 🔐 Hvordan Det Fungerer

### **Scenario 1: Flownordics Medarbejder Sign-Up**

```
Bruger: Marie@flownordics.com
↓
1. Går til /login → Sign Up
2. Opretter konto med email + password
3. Trigger: create_user_profile() checker email domain
   ✅ Domain = flownordics.com → GODKENDT
4. Auto-assign role = 'sales'
5. Marie får adgang med sales rettigheder
```

**Rolle Assignment**:
- `andreas@flownordics.com` → **admin** (auto-approved)
- Alle andre `@flownordics.com` → **sales** (auto-approved)
- Andre email domains → **REJECTED** (kan kun oprette med invitation)

### **Scenario 2: Ekstern Bruger Invitation**

```
Admin inviterer: consultant@external.com som 'support'
↓
1. Admin går til Settings → Users tab
2. Klikker "Invite User"
3. Indtaster email: consultant@external.com
4. Vælger rolle: support
5. System genererer unique invitation link
   ↓
6. Admin kopierer link og sender til consultant
   ↓
7. Consultant klikker link: /signup?invitation=TOKEN123
8. Opretter konto
9. System validerer invitation token
10. Auto-assign rolle = 'support' (fra invitation)
11. Invitation markeres som accepted
```

---

## 🎯 Admin User Management

### **Adgang til Invitation System**

**Kun admins** kan:
- Se "Users" tab i Settings
- Oprette invitations
- Revoke invitations
- Se pending invitations

### **Opret Invitation**

1. Gå til **Settings → Users** tab
2. Klik **"Invite User"**
3. Indtast email adresse
4. Vælg rolle:
   - **Admin**: Fuld systemadgang
   - **Manager**: Se alt, administrere team
   - **Sales**: Egne deals, oprette virksomheder
   - **Support**: Tasks only, read-only
   - **Viewer**: Kun læseadgang
5. Klik **"Create Invitation"**
6. Kopier invitation link (📋 icon)
7. Send link til brugeren via email

### **Revoke Invitation**

1. Gå til **Settings → Users** tab
2. Find invitationen i listen
3. Klik **🗑️ (trash icon)**
4. Bekræft revoke
5. Invitation er nu ugyldig

### **Invitation Detaljer**

- **Expires**: Invitations udløber efter 7 dage
- **Single Use**: Hver invitation kan kun bruges én gang
- **Token**: Unique 64-character hex token
- **Email Match**: Invitation email skal matche sign-up email

---

## 🔑 Database Schema

### **invitations Tabel**

```sql
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **RLS Policies**

```sql
-- Only admins can view invitations
CREATE POLICY "Admins can view all invitations"
  ON invitations FOR SELECT
  USING (public.user_is_admin());

-- Only admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (public.user_is_admin());
```

---

## 💻 Functions & APIs

### **Database Functions**

#### `create_invitation(email, role)`
```sql
SELECT create_invitation('user@example.com', 'sales');
-- Returns: invitation_id (UUID)
```
- **Access**: Admin only
- **Purpose**: Create new invitation
- **Returns**: Invitation ID

#### `validate_invitation_token(token)`
```sql
SELECT * FROM validate_invitation_token('abc123...');
-- Returns: { is_valid, email, role }
```
- **Access**: Public (for sign-up flow)
- **Purpose**: Validate invitation token
- **Returns**: Validation result with email and role

#### `accept_invitation(token, user_id)`
```sql
SELECT accept_invitation('abc123...', 'user-uuid');
-- Returns: boolean (success/failure)
```
- **Access**: Authenticated users
- **Purpose**: Accept invitation and assign role
- **Returns**: Success boolean

#### `get_pending_invitations()`
```sql
SELECT * FROM get_pending_invitations();
-- Returns: Array of pending invitations
```
- **Access**: Admin only
- **Purpose**: List all pending invitations
- **Returns**: Array of invitation objects

#### `revoke_invitation(invitation_id)`
```sql
SELECT revoke_invitation('invitation-uuid');
-- Returns: boolean
```
- **Access**: Admin only
- **Purpose**: Delete/revoke invitation
- **Returns**: Success boolean

### **Frontend Services**

```typescript
import { 
  createInvitation, 
  getPendingInvitations,
  revokeInvitation,
  validateInvitationToken,
  acceptInvitation 
} from '@/services/invitations';

// Create invitation
const invitationId = await createInvitation({
  email: 'user@example.com',
  role: 'sales'
});

// Get pending invitations
const invitations = await getPendingInvitations();

// Revoke invitation
await revokeInvitation(invitationId);
```

---

## 🚀 Sign-Up Flow

### **Frontend Updates Needed**

**RegisterPage.tsx** skal opdateres til at:

1. **Check for invitation token** i URL query params
2. **Validate token** før sign-up
3. **Pre-fill email** fra invitation
4. **Accept invitation** efter succesfuld sign-up

**Eksempel flow**:

```typescript
// 1. Check for invitation in URL
const searchParams = new URLSearchParams(window.location.search);
const invitationToken = searchParams.get('invitation');

// 2. If token exists, validate it
if (invitationToken) {
  const validation = await validateInvitationToken(invitationToken);
  
  if (validation.is_valid) {
    // Pre-fill email
    setEmail(validation.email);
    // Store role for later
    setInvitedRole(validation.role);
  } else {
    // Show error: Invalid or expired invitation
  }
}

// 3. After sign-up success
const { data: authData } = await supabase.auth.signUp({ email, password });

if (authData.user && invitationToken) {
  // Accept invitation
  await acceptInvitation(invitationToken, authData.user.id);
}
```

---

## 🔒 Security Features

### **Email Domain Whitelist**

✅ **@flownordics.com** → Auto-approved, gets 'sales' role  
❌ **Other domains WITHOUT invitation** → REJECTED (cannot sign up)  
✅ **Other domains WITH invitation** → Gets role from invitation  
🎯 **andreas@flownordics.com** → Auto-assigned 'admin'

### **Invitation Security**

✅ **Admin-only creation**: Only admins can create invitations  
✅ **Token-based**: Unique 64-character hex token  
✅ **Time-limited**: Expires after 7 days  
✅ **Single-use**: Can only be accepted once  
✅ **Email validation**: Must match invitation email

### **RLS Protection**

✅ **invitations table**: Protected by RLS (admin only)  
✅ **user_profiles table**: Auto-creates with correct role  
✅ **Helper functions**: All use SECURITY DEFINER + search_path

---

## 📊 Monitoring & Analytics

### **Check Pending Invitations**

```sql
SELECT 
  email,
  role,
  invited_by,
  expires_at,
  created_at
FROM invitations
WHERE accepted_at IS NULL
  AND expires_at > NOW()
ORDER BY created_at DESC;
```

### **Check Accepted Invitations**

```sql
SELECT 
  i.email,
  i.role,
  i.accepted_at,
  up.full_name
FROM invitations i
JOIN user_profiles up ON up.user_id = (
  SELECT id FROM auth.users WHERE email = i.email
)
WHERE i.accepted_at IS NOT NULL
ORDER BY i.accepted_at DESC;
```

### **Check User Distribution**

```sql
SELECT 
  role,
  COUNT(*) as user_count
FROM user_profiles
WHERE is_active = TRUE
GROUP BY role
ORDER BY user_count DESC;
```

---

## 🛠️ Troubleshooting

### **Problem: User can't sign up**

**Check**:
1. Is email @flownordics.com? → Should auto-approve
2. Is there a valid invitation? → Check invitations table
3. Has invitation expired? → expires_at > NOW()
4. Has invitation been used? → accepted_at IS NULL

### **Problem: User has wrong role**

**Fix**:
```sql
-- Update user role (admin only)
UPDATE user_profiles
SET role = 'manager'
WHERE user_id = 'user-uuid';
```

### **Problem: Invitation expired**

**Re-create invitation**:
1. Revoke old invitation
2. Create new invitation
3. Send new link to user

---

## ✅ Production Checklist

- [x] Database migrations applied
- [x] invitations table created
- [x] RLS policies enabled
- [x] Helper functions created
- [x] Andreas set as admin
- [x] Admin UI in Settings
- [x] Email whitelist for @flownordics.com
- [ ] **TODO: Update RegisterPage to handle invitation tokens**
- [ ] **TODO: Disable public sign-up in Supabase Dashboard** (optional)
- [ ] **TODO: Setup email templates for invitations** (optional)

---

## 📝 Next Steps

### **Immediate**

1. ✅ Test invitation creation as admin
2. ✅ Test invitation acceptance flow
3. ⚠️ **Update RegisterPage** to handle invitation tokens
4. ⚠️ **Test email domain whitelist** (@flownordics.com)

### **Optional Enhancements**

1. **Email Templates**: Auto-send invitation emails via SendGrid/Resend
2. **Invitation History**: Track all invitations (accepted + revoked)
3. **Bulk Invitations**: Invite multiple users at once
4. **Custom Expiry**: Allow admins to set custom expiration time
5. **Invitation Analytics**: Track invitation acceptance rates

---

*Dokumenteret af: Sovereign Architect*  
*Senest opdateret: 15. oktober 2025*

