import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || "https://qrhcoaujvlbzwtscftyn.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_Wi0D46kgiYXEdS0wOjgY7Q_CV-1iY9k";
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  try {
    const { count, error } = await supabase
      .from('boxes')
      .select('*', { count: 'exact', head: true });

    if (error) {
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
      } else {
        console.error("Error checking boxes table:", error.message);
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
        if (error.code === 'PGRST116' || 
            error.message.includes('relation "boxes" does not exist') ||
            error.message.includes('schema cache')) {
          return res.status(200).json({ 
            boxes: [], 
            occupied: 0, 
            pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
            error: "Table 'boxes' does not exist in Supabase. Please create it with columns: id (int8), status (text), secret_key (text), startup_name (text), tagline (text), category (text), logo_url (text), target_url (text), inventor_name (text), created_at (timestamptz)."
          });
        }
        throw error;
      }

      // If table exists but is empty, seed it now
      if (count === 0 && page === 1) {
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
        } else {
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
      const { id, startup_name, tagline, category, logo_url, target_url, inventor_name, email } = req.body;
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
          inventor_name
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
      const { secret_key, startup_name, tagline, category, logo_url, target_url, inventor_name } = req.body;

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

      if (box.secret_key !== secret_key) {
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
      const { key } = req.query;

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

      if (box.secret_key === key) {
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
