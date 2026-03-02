# Facebook OAuth – REDIRECT URI & TOKEN_ENCRYPTION_KEY

`FACEBOOK_APP_ID` aur `FACEBOOK_APP_SECRET` aapko **Meta Developer Console** se milte hain.  
Neeche wale do aap **khud** set karte hain (Facebook inhe provide nahi karta).

---

## 1. FACEBOOK_REDIRECT_URI (kaha se / kaise set karein)

**Kya hai:** Woh URL jahan Facebook user ko login ke baad **wapas bhejega**. Ye aapki app ka callback URL hai.

**Kaise set karein:**

- **Local development (Docker / same machine):**  
  `http://localhost:8000/api/v1/auth/facebook/callback`
- **Agar app kisi aur port pe hai:**  
  `http://localhost:<PORT>/api/v1/auth/facebook/callback`
- **Production:**  
  `https://yourdomain.com/api/v1/auth/facebook/callback`

**.env mein:**
```env
FACEBOOK_REDIRECT_URI=http://localhost:8000/api/v1/auth/facebook/callback
```

**Zaroori:** Ye **exact same** URL **Meta App** mein bhi add karni hogi:

1. [developers.facebook.com](https://developers.facebook.com) → apna App → **Facebook Login** → **Settings**
2. **Valid OAuth Redirect URIs** mein same URL add karein (e.g. `http://localhost:8000/api/v1/auth/facebook/callback`)
3. Save Changes

---

## 2. TOKEN_ENCRYPTION_KEY (kaha se milega)

**Kya hai:** Ye **Facebook ka key nahi hai**. Ye aapki app ka **apna** secret key hai jisse hum Facebook ke access tokens ko database mein **encrypt** karke store karte hain.

**Kaise generate karein:** Ek baar Python se naya key generate karein aur use `.env` mein daal dein.

**Option A – Terminal (project root pe):**
```powershell
cd E:\FB_Page_Post_Creator
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Jo line print hogi, wahi aapki `TOKEN_ENCRYPTION_KEY` hai. Copy karke `.env` mein paste karein:

```env
TOKEN_ENCRYPTION_KEY=abc123...jo_bhi_print_hua
```

**Option B – Script (optional):**  
`python -m scripts.generate_encryption_key` — agar aap ye script bana dein to same key dobara generate kar sakte ho (lekin **har baar naya key mat lo**; ek key generate karke permanent use karein, warna purane tokens decrypt nahi honge).

---

## Summary

| Variable | Kaha se | Example |
|----------|---------|--------|
| `FACEBOOK_APP_ID` | Meta App Dashboard | App ID |
| `FACEBOOK_APP_SECRET` | Meta App Dashboard → Settings | App Secret |
| `FACEBOOK_REDIRECT_URI` | **Aap define karte ho** – app ka callback URL; same Meta “Valid OAuth Redirect URIs” mein add karein | `http://localhost:8000/api/v1/auth/facebook/callback` |
| `TOKEN_ENCRYPTION_KEY` | **Aap generate karte ho** – `Fernet.generate_key().decode()` se; Facebook se nahi milta | (32-byte base64 string) |

Redirect URI change karoge to Meta App settings mein bhi wahi URL add karna hoga.
