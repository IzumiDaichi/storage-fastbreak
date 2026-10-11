const fs = require("fs");
const http = require("http");
const https = require("https");
const { AUTH_PATH, PORT, REDIRECT_URI } = require("./constants");
const { state } = require("./state");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function getCurrentAuth() {
  try {
    if (!fs.existsSync(AUTH_PATH)) return null;
    const raw = fs.readFileSync(AUTH_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getCurrentEmail() {
  return getCurrentAuth()?.email || null;
}

function refreshAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }).toString();

    const options = {
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.setTimeout(5000, () => {
      req.destroy(new Error("Google token refresh timed out."));
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function getValidAccessToken() {
  const auth = getCurrentAuth();
  if (!auth?.tokens) throw new Error("No auth tokens found.");

  const { access_token, refresh_token, expiry_date } = auth.tokens;
  const isExpired = expiry_date && Date.now() >= expiry_date - 60000;

  if (!isExpired) return access_token;

  console.log("[AUTH] Refreshing expired access token...");
  const refreshed = await refreshAccessToken(refresh_token);
  if (refreshed.error) throw new Error(`Token refresh failed: ${refreshed.error}`);

  auth.tokens = {
    ...auth.tokens,
    access_token: refreshed.access_token,
    expiry_date: Date.now() + refreshed.expires_in * 1000,
  };

  fs.writeFileSync(AUTH_PATH, JSON.stringify(auth, null, 2), "utf8");
  return refreshed.access_token;
}

function exchangeCodeForTokens(code) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }).toString();

    const req = https.request(
      {
        hostname: "oauth2.googleapis.com",
        path: "/token",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

function fetchUserEmail(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.googleapis.com",
        path: "/oauth2/v2/userinfo",
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data).email || "active-vault@gmail.com");
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

function revokeToken(token) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({ token }).toString();
    const req = https.request(
      {
        hostname: "oauth2.googleapis.com",
        path: "/revoke",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        res.resume();
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Google token revocation failed with status ${res.statusCode}.`));
          }
        });
      }
    );

    req.setTimeout(5000, () => {
      req.destroy(new Error("Google token revocation timed out."));
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function signOutCurrentAuth() {
  const auth = getCurrentAuth();
  const token = auth?.tokens?.refresh_token || auth?.tokens?.access_token;
  let revoked = !token;

  if (fs.existsSync(AUTH_PATH)) fs.unlinkSync(AUTH_PATH);

  try {
    if (token) {
      await revokeToken(token);
      revoked = true;
    }
  } catch (error) {
    console.error("[AUTH] Remote token revocation failed; local credentials were removed.", error);
  }

  return { revoked };
}

function startLocalAuthListenerServer() {
  const server = http.createServer(async (req, res) => {
    if (!req.url.startsWith("/api/auth/callback")) return;

    const code = new URL(req.url, `http://${req.headers.host}`).searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h3>Authentication failed.</h3>");
      return;
    }

    try {
      const tokenResponse = await exchangeCodeForTokens(code);
      if (tokenResponse.error) {
        throw new Error(tokenResponse.error_description || tokenResponse.error);
      }

      const realUserEmail = await fetchUserEmail(tokenResponse.access_token);
      fs.writeFileSync(
        AUTH_PATH,
        JSON.stringify(
          {
            tokens: {
              ...tokenResponse,
              expiry_date: Date.now() + tokenResponse.expires_in * 1000,
            },
            email: realUserEmail,
          },
          null,
          2
        ),
        "utf8"
      );

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html style="background:#0b0f19;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:2.5rem;background:#111827;border:1px solid #1f2937;border-radius:1rem;max-width:420px;">
            <h1 style="color:#00c97a;font-size:1.4rem;margin:0 0 0.5rem;">Authentication Successful!</h1>
            <p style="color:#9ca3af;font-size:0.85rem;margin:0;">You can close this tab safely.</p>
          </div>
        </html>
      `);

      if (state.mainWindow) {
        state.mainWindow.webContents.send("google:auth-success", { email: realUserEmail });
      }
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h3>Auth failed: ${error.message}</h3>`);
    }
  });

  server.listen(PORT, "localhost");
}

module.exports = {
  getCurrentAuth,
  getCurrentEmail,
  getValidAccessToken,
  signOutCurrentAuth,
  startLocalAuthListenerServer,
};
