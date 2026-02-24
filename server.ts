import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || "https://qrhcoaujvlbzwtscftyn.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_Wi0D46kgiYXEdS0wOjgY7Q_CV-1iY9k";

if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
  console.warn("⚠️  Supabase environment variables are missing. Using fallback credentials which may not work for your project.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  try {
    const { count, error } = await supabase
      .from('boxes')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error("❌ Supabase connection error during seeding:", error.message);
      if (error.message.includes('relation "boxes" does not exist') || 
          error.message.includes('schema cache')) {
        console.warn("⚠️  Supabase Table Missing: The 'boxes' table does not exist yet.");
        console.log("Please create a table named 'boxes' in your Supabase project with the following columns:");
        console.log("- id: int8 (Primary Key)");
        console.log("- status: text (default: 'available')");
        console.log("- secret_key: text");
        console.log("- startup_name: text");
        console.log("- tagline: text");
        console.log("- category: text");
        console.log("- logo_url: text");
        console.log("- target_url: text");
        console.log("- inventor_name: text");
        console.log("- created_at: timestamptz (default: now())");
        console.log("\nAlso create an 'orders' table:");
        console.log("- id: uuid (Primary Key, default: gen_random_uuid())");
        console.log("- box_id: int8 (References boxes.id)");
        console.log("- startup_name: text");
        console.log("- inventor_name: text");
        console.log("- category: text");
        console.log("- target_url: text");
        console.log("- email: text");
        console.log("- payment_amount: numeric (default: 100)");
        console.log("- created_at: timestamptz (default: now())");
      }
      return;
    }

    if (count === 0) {
      console.log("Seeding 100 boxes to Supabase...");
      const boxes = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        status: 'available'
      }));

      const { error: insertError } = await supabase
        .from('boxes')
        .insert(boxes);

      if (insertError) {
        console.error("Error seeding boxes:", insertError.message);
      } else {
        console.log("Successfully seeded 100 boxes.");
      }
    }
  } catch (err) {
    console.error("Seeding failed:", err);
  }
}

async function startServer() {
  await seedDatabase();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // GitHub OAuth Routes
  app.get('/api/auth/github/url', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'];
    const redirectUri = `${protocol}://${host}/auth/github/callback`;

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'user:email',
      state: Math.random().toString(36).substring(7),
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  });

  app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('No code provided');
    }

    try {
      // 1. Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenResponse.json() as { access_token?: string, error?: string };

      if (tokenData.error || !tokenData.access_token) {
        throw new Error(tokenData.error || 'Failed to get access token');
      }

      // 2. Get user info from GitHub
      const userResponse = await fetch('https://github.com/api/v3/user', {
        headers: {
          'Authorization': `token ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });

      // Fallback to standard API if v3 fails (some enterprise setups)
      let userData;
      if (userResponse.ok) {
        userData = await userResponse.json();
      } else {
        const standardUserResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${tokenData.access_token}`,
            'Accept': 'application/json',
          },
        });
        userData = await standardUserResponse.json();
      }

      // 3. Send success message to parent window and close popup
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f4f4f5;">
            <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
              <h2 style="color: #18181b; margin-bottom: 0.5rem;">Authentication Successful</h2>
              <p style="color: #71717a; font-size: 0.875rem;">Connecting your account... This window will close automatically.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'GITHUB_AUTH_SUCCESS', 
                    user: ${JSON.stringify({
                      id: userData.id,
                      login: userData.login,
                      avatar_url: userData.avatar_url,
                      email: userData.email
                    })} 
                  }, '*');
                  setTimeout(() => window.close(), 1000);
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('GitHub OAuth Error:', error);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  // API Routes
  app.get("/api/boxes", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = 100;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: boxes, error, count } = await supabase
        .from('boxes')
        .select('*', { count: 'exact' })
        .order('id', { ascending: true })
        .range(from, to);

      if (error) {
        console.error("Supabase error fetching boxes:", error.message);
        return res.status(200).json({ 
          boxes: [], 
          occupied: 0, 
          pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
          setupRequired: true,
          errorType: error.message.includes('relation "boxes" does not exist') ? "TABLE_MISSING" : "CONNECTION_ERROR",
          message: error.message
        });
      }

      // If table exists but is empty, seed it now
      if ((!boxes || boxes.length === 0) && page === 1) {
        console.log("Table 'boxes' is empty. Seeding 100 boxes...");
        const seedData = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          status: 'available'
        }));
        
        const { data: newBoxes, error: seedError } = await supabase
          .from('boxes')
          .insert(seedData)
          .select();

        if (seedError) {
          console.error("Seeding failed during fetch:", seedError.message);
          return res.status(200).json({ 
            boxes: [],
            occupied: 0,
            pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
            setupRequired: true,
            errorType: "SEED_FAILED",
            message: `Table 'boxes' is empty and auto-seeding failed: ${seedError.message}.` 
          });
        }
        
        return res.json({
          boxes: newBoxes,
          occupied: 0,
          pagination: {
            page: 1,
            limit: 100,
            total: 100,
            totalPages: 1
          }
        });
      }

      const { count: occupiedCount, error: occupiedError } = await supabase
        .from('boxes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (occupiedError) throw occupiedError;
      
      res.json({
        boxes,
        occupied: occupiedCount || 0,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      });
    } catch (error: any) {
      console.error("Supabase fetch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/purchase", async (req, res) => {
    try {
      const { id, startup_name, tagline, category, logo_url, target_url, inventor_name, email, github_id } = req.body;
      const secret_key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      if (!id || id < 1) {
        return res.status(400).json({ error: "Invalid box ID" });
      }

      // Check if box is available
      const { data: box, error: fetchError } = await supabase
        .from('boxes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (box.status !== "available") {
        return res.status(400).json({ error: "Box already occupied" });
      }

      // 1. Update the box status
      const { data: updatedBox, error: updateError } = await supabase
        .from('boxes')
        .update({
          status: 'active',
          secret_key,
          startup_name,
          tagline,
          category,
          logo_url,
          target_url,
          inventor_name,
          github_id: github_id || null
        })
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;

      // 2. Record the order
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          box_id: id,
          startup_name,
          inventor_name,
          category,
          target_url,
          email,
          payment_amount: 100 // Default price
        });

      if (orderError) {
        console.error("Failed to record order (but purchase succeeded):", orderError.message);
      }

      res.json({ success: true, secret_key, box: updatedBox });
    } catch (error: any) {
      console.error("Supabase purchase error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/box/:id/update", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { secret_key, github_id, startup_name, tagline, category, logo_url, target_url, inventor_name } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid box ID" });
      }

      const { data: box, error: fetchError } = await supabase
        .from('boxes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!box) {
        return res.status(404).json({ error: "Box not found" });
      }

      // Allow update if secret_key matches OR github_id matches
      const isAuthorized = (secret_key && box.secret_key === secret_key) || 
                           (github_id && box.github_id === String(github_id));

      if (!isAuthorized) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data: updatedBox, error: updateError } = await supabase
        .from('boxes')
        .update({
          startup_name,
          tagline,
          category,
          logo_url,
          target_url,
          inventor_name
        })
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;

      res.json({ success: true, box: updatedBox });
    } catch (error: any) {
      console.error("Supabase update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/box/:id/auth", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { key, github_id } = req.query;

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid box ID" });
      }

      const { data: box, error: fetchError } = await supabase
        .from('boxes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!box) {
        return res.status(404).json({ error: "Box not found" });
      }

      const isAuthorized = (key && box.secret_key === key) || 
                           (github_id && box.github_id === String(github_id));

      if (isAuthorized) {
        const { secret_key, ...publicData } = box;
        res.json({ authenticated: true, box: publicData });
      } else {
        res.status(401).json({ authenticated: false });
      }
    } catch (error: any) {
      console.error("Supabase auth error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user/slots", async (req, res) => {
    try {
      const { github_id } = req.query;
      if (!github_id) return res.status(400).json({ error: "GitHub ID required" });

      const { data: slots, error } = await supabase
        .from('boxes')
        .select('*')
        .eq('github_id', String(github_id));

      if (error) throw error;
      res.json({ slots });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/seed", async (req, res) => {
    try {
      console.log("Manual seeding requested...");
      const seedData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        status: 'available'
      }));
      
      const { data, error } = await supabase
        .from('boxes')
        .upsert(seedData, { onConflict: 'id' })
        .select();

      if (error) throw error;
      res.json({ message: "Seeding successful", count: data.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
