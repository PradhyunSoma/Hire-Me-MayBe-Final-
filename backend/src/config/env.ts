import dotenv from "dotenv";

dotenv.config();

export interface EnvConfig {
  port: number;
  mlServiceUrl: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseStorageBucket: string;
}

const env: EnvConfig = {
  port: parseInt(process.env.PORT || "4000", 10),
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8001",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || "screenings",
};

export default env;
