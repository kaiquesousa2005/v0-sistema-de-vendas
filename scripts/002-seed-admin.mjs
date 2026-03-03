import { neon } from '@neondatabase/serverless';
import { createHash } from 'crypto';

const sql = neon(process.env.DATABASE_URL);

// bcrypt-like hashing using crypto (since we can't install bcryptjs in scripts easily)
// We'll use a proper approach: hash with SHA-256 + salt
// But for production, we'll use bcryptjs in the app code.
// For the seed, we pre-compute the bcrypt hash.

// The password is: Kaique1020*
// We'll store a bcrypt hash that the app will verify with bcryptjs
// Pre-computed bcrypt hash for "Kaique1020*" with 12 rounds:
// We need to generate this properly. Let's use a simple approach:
// Since we can't use bcryptjs here, we'll insert via the app's API later.
// Instead, let's just create the seed with a known hash.

// For now, let's use a SHA-256 based approach that we'll also use in the app
async function hashPassword(password) {
  const salt = 'v0_vehicle_system_salt_2024';
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return hash;
}

async function seed() {
  try {
    const passwordHash = await hashPassword('Kaique1020*');
    
    // Check if admin already exists
    const existing = await sql`SELECT id FROM admins WHERE email = 'kaique.freire@hotmail.com'`;
    
    if (existing.length > 0) {
      console.log('Admin already exists, skipping seed.');
      return;
    }
    
    await sql`INSERT INTO admins (email, password_hash, name) VALUES ('kaique.freire@hotmail.com', ${passwordHash}, 'Kaique Freire')`;
    
    console.log('Admin seeded successfully!');
    console.log('Email: kaique.freire@hotmail.com');
  } catch (error) {
    console.error('Error seeding admin:', error);
    throw error;
  }
}

seed();
