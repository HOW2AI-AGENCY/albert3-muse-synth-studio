import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SeedUserDefinition {
  key: string;
  email: string;
  password: string;
  fullName: string;
}

interface SeedContext {
  admin: SupabaseClient;
  users: Record<string, { id: string; email: string }>;
}

type SeedStatus = "success" | "skipped";

interface SeedResult {
  name: string;
  status: SeedStatus;
  details?: string;
}

type SeedStep = (ctx: SeedContext) => Promise<SeedResult>;

const DEFAULT_ADMIN_EMAIL = "admin@example.com";
const DEFAULT_ADMIN_PASSWORD = "Admin123!";
const DEFAULT_ARTIST_EMAIL = "demo.artist@example.com";
const DEFAULT_ARTIST_PASSWORD = "Demo123!";

function loadEnvFromSupabaseDotEnv() {
  const envPath = path.resolve(process.cwd(), "supabase", ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf-8");
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (!key) continue;
    const value = rest.join("=").trim();
    if (value && !process.env[key]) {
      const unquoted = value.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
      process.env[key] = unquoted;
    }
  }
}

function requireEnv(name: string, fallbackEnv?: string[]): string {
  if (process.env[name]) {
    return process.env[name] as string;
  }
  if (fallbackEnv) {
    for (const alt of fallbackEnv) {
      if (process.env[alt]) {
        return process.env[alt] as string;
      }
    }
  }
  throw new Error(`Environment variable ${name}${fallbackEnv?.length ? ` (or ${fallbackEnv.join(", ")})` : ""} is required for seeding.`);
}

async function tableExists(client: SupabaseClient, tableName: string): Promise<boolean> {
  const { error } = await client
    .from(tableName)
    .select("id", { head: true, count: "exact" })
    .limit(1);

  if (!error) {
    return true;
  }

  const code = (error as { code?: string }).code;
  const message = (error as { message?: string }).message ?? "";
  if (code === "42P01" || message.includes("does not exist") || message.includes("relation")) {
    console.warn(`⚠️  Table '${tableName}' does not exist. Skipping related seed step.`);
    return false;
  }

  throw error;
}

async function seedUsers(ctx: SeedContext): Promise<SeedResult> {
  const definitions: SeedUserDefinition[] = [
    {
      key: "admin",
      email: process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD,
      fullName: "Seed Admin",
    },
    {
      key: "artist",
      email: process.env.SEED_ARTIST_EMAIL ?? DEFAULT_ARTIST_EMAIL,
      password: process.env.SEED_ARTIST_PASSWORD ?? DEFAULT_ARTIST_PASSWORD,
      fullName: "Demo Artist",
    },
  ];

  for (const def of definitions) {
    const existing = await ctx.admin.auth.admin.getUserByEmail(def.email);
    if (existing.data?.user) {
      ctx.users[def.key] = { id: existing.data.user.id, email: def.email };
      continue;
    }

    const created = await ctx.admin.auth.admin.createUser({
      email: def.email,
      password: def.password,
      email_confirm: true,
      user_metadata: { full_name: def.fullName },
    });

    if (created.error || !created.data?.user) {
      throw new Error(`Failed to create seed user ${def.email}: ${created.error?.message ?? "unknown error"}`);
    }

    ctx.users[def.key] = { id: created.data.user.id, email: def.email };
  }

  return {
    name: "seed-users",
    status: "success",
    details: `Ensured ${definitions.length} seed users`,
  };
}

async function seedRoles(ctx: SeedContext): Promise<SeedResult> {
  if (!(await tableExists(ctx.admin, "user_roles"))) {
    return { name: "seed-roles", status: "skipped", details: "user_roles table missing" };
  }

  const adminUser = ctx.users["admin"];
  const artistUser = ctx.users["artist"];

  const payload = [
    adminUser ? { user_id: adminUser.id, role: "admin" } : null,
    artistUser ? { user_id: artistUser.id, role: "user" } : null,
  ].filter(Boolean) as Array<{ user_id: string; role: string }>;

  if (payload.length === 0) {
    return { name: "seed-roles", status: "skipped", details: "no users available" };
  }

  const { error } = await ctx.admin.from("user_roles").upsert(payload, {
    onConflict: "user_id,role",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Failed to upsert user roles: ${error.message}`);
  }

  return {
    name: "seed-roles",
    status: "success",
    details: `Assigned roles for ${payload.length} users`,
  };
}

async function seedDemoTracks(ctx: SeedContext): Promise<SeedResult> {
  if (!(await tableExists(ctx.admin, "tracks"))) {
    return { name: "seed-demo-tracks", status: "skipped", details: "tracks table missing" };
  }

  const owner = ctx.users["artist"] ?? ctx.users["admin"];
  if (!owner) {
    return { name: "seed-demo-tracks", status: "skipped", details: "no seed user for demo tracks" };
  }

  const demoTracks = [
    {
      id: "00000000-0000-0000-0000-00000000DE01",
      user_id: owner.id,
      title: "Neon Skyline",
      prompt: "An uplifting synthwave anthem with nostalgic pads and driving bass",
      provider: "suno",
      status: "ready",
      is_public: true,
      genre: "synthwave",
      mood: "uplifting",
      style_tags: ["synthwave", "retro", "instrumental"],
      metadata: {
        bpm: 110,
        reference: "seed",
        seed_version: 1,
      },
    },
    {
      id: "00000000-0000-0000-0000-00000000DE02",
      user_id: owner.id,
      title: "Lo-fi Dreamscape",
      prompt: "Warm lo-fi beats with vinyl crackle and mellow electric piano",
      provider: "suno",
      status: "ready",
      is_public: true,
      genre: "lofi",
      mood: "chill",
      style_tags: ["lofi", "study", "relax"],
      metadata: {
        bpm: 82,
        reference: "seed",
        seed_version: 1,
      },
    },
  ];

  const { error } = await ctx.admin.from("tracks").upsert(demoTracks, {
    onConflict: "id",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Failed to seed demo tracks: ${error.message}`);
  }

  return {
    name: "seed-demo-tracks",
    status: "success",
    details: `Upserted ${demoTracks.length} demo tracks for user ${owner.email}`,
  };
}

async function seedReferenceData(ctx: SeedContext): Promise<SeedResult> {
  if (!(await tableExists(ctx.admin, "app_settings"))) {
    return { name: "seed-reference-data", status: "skipped", details: "app_settings table missing" };
  }

  const settingsPayload = [
    {
      key: "credit_mode",
      value: { mode: "test", description: "Seeded default credit mode" },
    },
  ];

  const demoTracks = ["00000000-0000-0000-0000-00000000DE01", "00000000-0000-0000-0000-00000000DE02"];
  settingsPayload.push({ key: "demo_tracks", value: { track_ids: demoTracks } });

  const { error } = await ctx.admin.from("app_settings").upsert(settingsPayload, {
    onConflict: "key",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Failed to seed app settings: ${error.message}`);
  }

  return {
    name: "seed-reference-data",
    status: "success",
    details: `Ensured ${settingsPayload.length} app settings records`,
  };
}

async function run() {
  loadEnvFromSupabaseDotEnv();

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY", ["SUPABASE_SERVICE_ROLE"]);

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false },
  });

  const context: SeedContext = { admin, users: {} };
  const steps: SeedStep[] = [seedUsers, seedRoles, seedDemoTracks, seedReferenceData];

  console.log("\n🌱 Starting Supabase seed...");

  for (const step of steps) {
    try {
      const result = await step(context);
      console.log(` - ${result.name}: ${result.status}${result.details ? ` (${result.details})` : ""}`);
    } catch (error) {
      console.error(` - ${step.name} failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  console.log("✅ Seed finished successfully.\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error("❌ Seed failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
